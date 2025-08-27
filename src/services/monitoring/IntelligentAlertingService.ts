import { AnomalyEvent, PredictiveInsight } from './AIMonitoringService';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // minutes
  lastTriggered?: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'regex';
  value: any;
  duration: number; // minutes
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'email' | 'slack' | 'pagerduty' | 'auto_resolve';
  config: { [key: string]: any };
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  correlationGroup?: string;
  autoResolved: boolean;
}

export interface AlertCorrelation {
  id: string;
  alerts: Alert[];
  pattern: string;
  confidence: number;
  rootCause?: string;
  recommendations: string[];
  status: 'investigating' | 'identified' | 'resolved';
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'sms';
  config: { [key: string]: any };
  enabled: boolean;
  recipients?: string[];
  schedule?: NotificationSchedule;
}

export interface NotificationSchedule {
  timezone: string;
  workingHours: {
    start: string; // HH:MM
    end: string; // HH:MM
    days: number[]; // 0-6, Sunday = 0
  };
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  level: number;
  delay: number; // minutes
  actions: string[]; // action IDs
  recipients: string[];
}

export class IntelligentAlertingService {
  private static instance: IntelligentAlertingService;
  private alertRules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];
  private correlations: AlertCorrelation[] = [];
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private alertHistory: Map<string, Alert[]> = new Map();
  private cooldownTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.initializeDefaultRules();
    this.initializeNotificationChannels();
  }

  public static getInstance(): IntelligentAlertingService {
    if (!IntelligentAlertingService.instance) {
      IntelligentAlertingService.instance = new IntelligentAlertingService();
    }
    return IntelligentAlertingService.instance;
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        description: 'Alert when CPU usage exceeds 80% for more than 5 minutes',
        conditions: [
          {
            metric: 'cpu_usage',
            operator: 'gte',
            value: 80,
            duration: 5
          }
        ],
        actions: [
          {
            type: 'notification',
            config: { channel: 'slack', recipients: ['ops-team'] },
            enabled: true
          },
          {
            type: 'auto_resolve',
            config: { threshold: 70 },
            enabled: true
          }
        ],
        priority: 'high',
        enabled: true,
        cooldown: 15
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds 85% for more than 5 minutes',
        conditions: [
          {
            metric: 'memory_usage',
            operator: 'gte',
            value: 85,
            duration: 5
          }
        ],
        actions: [
          {
            type: 'notification',
            config: { channel: 'slack', recipients: ['ops-team'] },
            enabled: true
          },
          {
            type: 'webhook',
            config: { url: '/api/auto-scale', method: 'POST' },
            enabled: true
          }
        ],
        priority: 'high',
        enabled: true,
        cooldown: 15
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5% for more than 2 minutes',
        conditions: [
          {
            metric: 'error_rate',
            operator: 'gte',
            value: 5,
            duration: 2
          }
        ],
        actions: [
          {
            type: 'notification',
            config: { channel: 'pagerduty', recipients: ['oncall'] },
            enabled: true
          },
          {
            type: 'webhook',
            config: { url: '/api/health-check', method: 'POST' },
            enabled: true
          }
        ],
        priority: 'critical',
        enabled: true,
        cooldown: 5
      },
      {
        id: 'response_time_degradation',
        name: 'Response Time Degradation',
        description: 'Alert when response time increases by 50% from baseline',
        conditions: [
          {
            metric: 'response_time_increase',
            operator: 'gte',
            value: 50,
            duration: 10
          }
        ],
        actions: [
          {
            type: 'notification',
            config: { channel: 'slack', recipients: ['dev-team'] },
            enabled: true
          },
          {
            type: 'email',
            config: { recipients: ['tech-leads'] },
            enabled: true
          }
        ],
        priority: 'medium',
        enabled: true,
        cooldown: 30
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Initialize notification channels
   */
  private initializeNotificationChannels(): void {
    const channels: NotificationChannel[] = [
      {
        id: 'slack-ops',
        name: 'Slack Operations',
        type: 'slack',
        config: {
          webhook_url: process.env.SLACK_WEBHOOK_URL || '',
          channel: '#ops-alerts',
          username: 'Test Buddy Alerts'
        },
        enabled: true,
        recipients: ['ops-team'],
        schedule: {
          timezone: 'UTC',
          workingHours: {
            start: '09:00',
            end: '17:00',
            days: [1, 2, 3, 4, 5] // Monday to Friday
          },
          escalationRules: [
            {
              level: 1,
              delay: 5,
              actions: ['slack', 'email'],
              recipients: ['ops-team']
            },
            {
              level: 2,
              delay: 15,
              actions: ['slack', 'email', 'pagerduty'],
              recipients: ['ops-team', 'tech-leads']
            },
            {
              level: 3,
              delay: 30,
              actions: ['slack', 'email', 'pagerduty', 'sms'],
              recipients: ['ops-team', 'tech-leads', 'management']
            }
          ]
        }
      },
      {
        id: 'email-alerts',
        name: 'Email Alerts',
        type: 'email',
        config: {
          smtp_host: process.env.SMTP_HOST || '',
          smtp_port: process.env.SMTP_PORT || 587,
          from_email: 'alerts@testbuddy.com',
          subject_template: 'Test Buddy Alert: {severity} - {rule_name}'
        },
        enabled: true,
        recipients: ['ops-team', 'tech-leads'],
        schedule: {
          timezone: 'UTC',
          workingHours: {
            start: '00:00',
            end: '23:59',
            days: [0, 1, 2, 3, 4, 5, 6] // All days
          },
          escalationRules: [
            {
              level: 1,
              delay: 10,
              actions: ['email'],
              recipients: ['ops-team']
            },
            {
              level: 2,
              delay: 30,
              actions: ['email', 'slack'],
              recipients: ['ops-team', 'tech-leads']
            }
          ]
        }
      },
      {
        id: 'pagerduty-critical',
        name: 'PagerDuty Critical',
        type: 'pagerduty',
        config: {
          api_key: process.env.PAGERDUTY_API_KEY || '',
          service_id: process.env.PAGERDUTY_SERVICE_ID || '',
          escalation_policy: 'critical-alerts'
        },
        enabled: true,
        recipients: ['oncall'],
        schedule: {
          timezone: 'UTC',
          workingHours: {
            start: '00:00',
            end: '23:59',
            days: [0, 1, 2, 3, 4, 5, 6] // All days
          },
          escalationRules: [
            {
              level: 1,
              delay: 0,
              actions: ['pagerduty'],
              recipients: ['oncall']
            },
            {
              level: 2,
              delay: 15,
              actions: ['pagerduty', 'slack'],
              recipients: ['oncall', 'backup-oncall']
            }
          ]
        }
      }
    ];

    channels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });
  }

  /**
   * Evaluate alert rules against current metrics
   */
  async evaluateAlertRules(metrics: { [key: string]: number }): Promise<Alert[]> {
    const newAlerts: Alert[] = [];

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (this.isInCooldown(rule)) continue;

      // Evaluate conditions
      if (this.evaluateConditions(rule.conditions, metrics)) {
        const alert = await this.createAlert(rule, metrics);
        newAlerts.push(alert);
        
        // Set cooldown timer
        this.setCooldownTimer(rule);
      }
    }

    // Add new alerts to the system
    this.alerts.push(...newAlerts);

    // Perform alert correlation
    await this.correlateAlerts();

    // Execute alert actions
    await this.executeAlertActions(newAlerts);

    return newAlerts;
  }

  /**
   * Check if rule is in cooldown
   */
  private isInCooldown(rule: AlertRule): boolean {
    if (!rule.lastTriggered || rule.cooldown === 0) return false;
    
    const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
    return timeSinceLastTrigger < rule.cooldown * 60 * 1000;
  }

  /**
   * Set cooldown timer for rule
   */
  private setCooldownTimer(rule: AlertRule): void {
    // Clear existing timer
    if (this.cooldownTimers.has(rule.id)) {
      clearTimeout(this.cooldownTimers.get(rule.id)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.cooldownTimers.delete(rule.id);
    }, rule.cooldown * 60 * 1000);

    this.cooldownTimers.set(rule.id, timer);
    rule.lastTriggered = new Date();
  }

  /**
   * Evaluate alert conditions
   */
  private evaluateConditions(conditions: AlertCondition[], metrics: { [key: string]: number }): boolean {
    return conditions.every(condition => {
      const metricValue = metrics[condition.metric];
      if (metricValue === undefined) return false;

      switch (condition.operator) {
        case 'gt':
          return metricValue > condition.value;
        case 'lt':
          return metricValue < condition.value;
        case 'eq':
          return metricValue === condition.value;
        case 'gte':
          return metricValue >= condition.value;
        case 'lte':
          return metricValue <= condition.value;
        case 'contains':
          return String(metricValue).includes(String(condition.value));
        case 'regex':
          return new RegExp(condition.value).test(String(metricValue));
        default:
          return false;
      }
    });
  }

  /**
   * Create alert from rule
   */
  private async createAlert(rule: AlertRule, metrics: { [key: string]: number }): Promise<Alert> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      timestamp: new Date(),
      severity: rule.priority,
      message: this.generateAlertMessage(rule, metrics),
      details: {
        rule,
        metrics,
        conditions: rule.conditions
      },
      status: 'active',
      autoResolved: false
    };

    return alert;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, metrics: { [key: string]: number }): string {
    const condition = rule.conditions[0];
    const metricValue = metrics[condition.metric];
    
    return `${rule.name}: ${condition.metric} is ${condition.operator} ${condition.value} (current: ${metricValue})`;
  }

  /**
   * Correlate related alerts
   */
  private async correlateAlerts(): Promise<void> {
    const activeAlerts = this.alerts.filter(a => a.status === 'active');
    
    // Group alerts by time proximity and similar patterns
    const alertGroups = this.groupAlertsByPattern(activeAlerts);
    
    for (const group of alertGroups) {
      if (group.length > 1) {
        const correlation = await this.createCorrelation(group);
        this.correlations.push(correlation);
        
        // Update alerts with correlation group
        group.forEach(alert => {
          alert.correlationGroup = correlation.id;
        });
      }
    }
  }

  /**
   * Group alerts by pattern
   */
  private groupAlertsByPattern(alerts: Alert[]): Alert[][] {
    const groups: Alert[][] = [];
    const processed = new Set<string>();

    for (const alert of alerts) {
      if (processed.has(alert.id)) continue;

      const group = [alert];
      processed.add(alert.id);

      // Find related alerts
      for (const otherAlert of alerts) {
        if (processed.has(otherAlert.id)) continue;

        if (this.areAlertsRelated(alert, otherAlert)) {
          group.push(otherAlert);
          processed.add(otherAlert.id);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Check if two alerts are related
   */
  private areAlertsRelated(alert1: Alert, alert2: Alert): boolean {
    // Time proximity (within 5 minutes)
    const timeDiff = Math.abs(alert1.timestamp.getTime() - alert2.timestamp.getTime());
    if (timeDiff > 5 * 60 * 1000) return false;

    // Similar severity
    if (alert1.severity !== alert2.severity) return false;

    // Similar metric patterns
    const metric1 = alert1.details?.conditions?.[0]?.metric;
    const metric2 = alert2.details?.conditions?.[0]?.metric;
    
    if (metric1 && metric2 && metric1 === metric2) return true;

    // Related metrics (e.g., cpu_usage and memory_usage)
    const relatedMetrics = [
      ['cpu_usage', 'memory_usage'],
      ['response_time', 'error_rate'],
      ['disk_usage', 'memory_usage']
    ];

    for (const [metricA, metricB] of relatedMetrics) {
      if ((metric1 === metricA && metric2 === metricB) || 
          (metric1 === metricB && metric2 === metricA)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create correlation for alert group
   */
  private async createCorrelation(alerts: Alert[]): Promise<AlertCorrelation> {
    const correlation: AlertCorrelation = {
      id: `correlation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alerts,
      pattern: this.identifyPattern(alerts),
      confidence: this.calculateCorrelationConfidence(alerts),
      rootCause: await this.identifyRootCause(alerts),
      recommendations: this.generateCorrelationRecommendations(alerts),
      status: 'investigating'
    };

    return correlation;
  }

  /**
   * Identify pattern in alert group
   */
  private identifyPattern(alerts: Alert[]): string {
    const metrics = alerts.map(a => a.details?.conditions?.[0]?.metric).filter(Boolean);
    const uniqueMetrics = [...new Set(metrics)];
    
    if (uniqueMetrics.length === 1) {
      return `Multiple ${uniqueMetrics[0]} alerts`;
    } else if (uniqueMetrics.length === 2) {
      return `${uniqueMetrics[0]} and ${uniqueMetrics[1]} correlation`;
    } else {
      return 'Multi-metric system issue';
    }
  }

  /**
   * Calculate correlation confidence
   */
  private calculateCorrelationConfidence(alerts: Alert[]): number {
    // Base confidence on number of alerts and time proximity
    let confidence = 0.5;
    
    if (alerts.length >= 3) confidence += 0.2;
    if (alerts.length >= 5) confidence += 0.1;
    
    // Check time proximity
    const timestamps = alerts.map(a => a.timestamp.getTime()).sort();
    const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
    
    if (timeSpan < 2 * 60 * 1000) confidence += 0.2; // Within 2 minutes
    if (timeSpan < 1 * 60 * 1000) confidence += 0.1; // Within 1 minute
    
    return Math.min(0.95, confidence);
  }

  /**
   * Identify root cause of correlated alerts
   */
  private async identifyRootCause(alerts: Alert[]): Promise<string | undefined> {
    // This would typically involve more sophisticated analysis
    // For now, we'll use simple heuristics
    
    const metrics = alerts.map(a => a.details?.conditions?.[0]?.metric).filter(Boolean);
    
    if (metrics.includes('cpu_usage') && metrics.includes('memory_usage')) {
      return 'High resource utilization causing system stress';
    }
    
    if (metrics.includes('response_time') && metrics.includes('error_rate')) {
      return 'Performance degradation leading to increased errors';
    }
    
    if (metrics.includes('disk_usage') && metrics.includes('memory_usage')) {
      return 'Storage pressure affecting memory management';
    }
    
    return undefined;
  }

  /**
   * Generate recommendations for correlated alerts
   */
  private generateCorrelationRecommendations(alerts: Alert[]): string[] {
    const recommendations: string[] = [];
    
    const metrics = alerts.map(a => a.details?.conditions?.[0]?.metric).filter(Boolean);
    
    if (metrics.includes('cpu_usage') || metrics.includes('memory_usage')) {
      recommendations.push('Investigate resource-intensive processes');
      recommendations.push('Consider scaling up resources');
      recommendations.push('Check for resource leaks');
    }
    
    if (metrics.includes('response_time')) {
      recommendations.push('Analyze database query performance');
      recommendations.push('Check external service dependencies');
      recommendations.push('Review recent code deployments');
    }
    
    if (metrics.includes('error_rate')) {
      recommendations.push('Examine error logs for patterns');
      recommendations.push('Check application health status');
      recommendations.push('Verify service dependencies');
    }
    
    recommendations.push('Monitor system metrics for improvement');
    recommendations.push('Document incident for future reference');
    
    return recommendations;
  }

  /**
   * Execute alert actions
   */
  private async executeAlertActions(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      const rule = this.alertRules.get(alert.ruleId);
      if (!rule) continue;

      for (const action of rule.actions) {
        if (!action.enabled) continue;

        try {
          await this.executeAction(action, alert);
        } catch (error) {
          console.error(`Failed to execute action ${action.type} for alert ${alert.id}:`, error);
        }
      }
    }
  }

  /**
   * Execute specific action
   */
  private async executeAction(action: AlertAction, alert: Alert): Promise<void> {
    switch (action.type) {
      case 'notification':
        await this.sendNotification(action.config, alert);
        break;
      case 'webhook':
        await this.sendWebhook(action.config, alert);
        break;
      case 'email':
        await this.sendEmail(action.config, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(action.config, alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(action.config, alert);
        break;
      case 'auto_resolve':
        await this.autoResolveAlert(alert, action.config);
        break;
    }
  }

  /**
   * Send notification through configured channel
   */
  private async sendNotification(config: any, alert: Alert): Promise<void> {
    const channelId = config.channel;
    const channel = this.notificationChannels.get(channelId);
    
    if (!channel || !channel.enabled) return;

    switch (channel.type) {
      case 'slack':
        await this.sendSlackNotification(config, alert);
        break;
      case 'email':
        await this.sendEmail(config, alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(config, alert);
        break;
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(config: any, alert: Alert): Promise<void> {
    const webhookUrl = config.webhook_url || process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const message = {
      text: `🚨 *${alert.severity.toUpperCase()} Alert*`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            {
              title: 'Rule',
              value: alert.details?.rule?.name || 'Unknown',
              short: true
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true
            }
          ]
        }
      ]
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(config: any, alert: Alert): Promise<void> {
    // This would integrate with an email service
    console.log(`Email notification for alert ${alert.id}: ${alert.message}`);
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(config: any, alert: Alert): Promise<void> {
    // This would integrate with PagerDuty API
    console.log(`PagerDuty alert for alert ${alert.id}: ${alert.message}`);
  }

  /**
   * Send webhook
   */
  private async sendWebhook(config: any, alert: Alert): Promise<void> {
    try {
      await fetch(config.url, {
        method: config.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }

  /**
   * Auto-resolve alert
   */
  private async autoResolveAlert(alert: Alert, config: any): Promise<void> {
    // Check if conditions are met for auto-resolution
    const threshold = config.threshold;
    if (threshold !== undefined) {
      // This would check current metrics against threshold
      // For now, we'll just mark as auto-resolved
      alert.autoResolved = true;
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
    }
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ffcc00';
      case 'low': return '#00cc00';
      default: return '#666666';
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.status !== 'active') return false;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.status === 'resolved') return false;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => a.status === 'active');
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get alert correlations
   */
  getAlertCorrelations(): AlertCorrelation[] {
    return this.correlations;
  }

  /**
   * Get notification channels
   */
  getNotificationChannels(): NotificationChannel[] {
    return Array.from(this.notificationChannels.values());
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    return true;
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  /**
   * Add notification channel
   */
  addNotificationChannel(channel: NotificationChannel): void {
    this.notificationChannels.set(channel.id, channel);
  }

  /**
   * Update notification channel
   */
  updateNotificationChannel(channelId: string, updates: Partial<NotificationChannel>): boolean {
    const channel = this.notificationChannels.get(channelId);
    if (!channel) return false;

    Object.assign(channel, updates);
    return true;
  }

  /**
   * Delete notification channel
   */
  deleteNotificationChannel(channelId: string): boolean {
    return this.notificationChannels.delete(channelId);
  }

  /**
   * Generate alerting report
   */
  generateAlertingReport(): any {
    const activeAlerts = this.getActiveAlerts();
    const totalAlerts = this.alerts.length;
    const resolvedAlerts = this.alerts.filter(a => a.status === 'resolved').length;
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalAlerts,
        activeAlerts: activeAlerts.length,
        resolvedAlerts,
        correlationGroups: this.correlations.length
      },
      activeAlerts: activeAlerts.slice(0, 10), // Top 10 active alerts
      correlations: this.correlations,
      rules: Array.from(this.alertRules.values()),
      channels: Array.from(this.notificationChannels.values()),
      recommendations: this.generateAlertingRecommendations()
    };
  }

  /**
   * Generate alerting recommendations
   */
  private generateAlertingRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    const highAlerts = activeAlerts.filter(a => a.severity === 'high');
    
    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical alerts immediately');
    }
    
    if (highAlerts.length > 3) {
      recommendations.push('Investigate high-severity alert patterns');
    }
    
    if (this.correlations.length > 0) {
      recommendations.push('Review alert correlations for root cause analysis');
    }
    
    const autoResolvedCount = this.alerts.filter(a => a.autoResolved).length;
    if (autoResolvedCount > 0) {
      recommendations.push('Monitor auto-resolved alerts for recurring patterns');
    }
    
    return recommendations;
  }

  /**
   * Cleanup old data
   */
  cleanup(): void {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    
    this.alerts = this.alerts.filter(a => a.timestamp > cutoffDate);
    this.correlations = this.correlations.filter(c => 
      c.alerts.some(a => a.timestamp > cutoffDate)
    );
    
    // Clear cooldown timers
    for (const timer of this.cooldownTimers.values()) {
      clearTimeout(timer);
    }
    this.cooldownTimers.clear();
  }
}
