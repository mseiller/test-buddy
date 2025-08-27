'use client';

import React from 'react';

interface SkipLinkProps {
  targetId?: string;
  children?: React.ReactNode;
  className?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ 
  targetId = 'main-content', 
  children = 'Skip to main content',
  className = ''
}) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.focus();
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`skip-link ${className}`}
      tabIndex={0}
    >
      {children}
    </a>
  );
};

// Multiple skip links for different sections
export const SkipLinks: React.FC = () => {
  const skipLinks = [
    { target: 'main-content', text: 'Skip to main content' },
    { target: 'navigation', text: 'Skip to navigation' },
    { target: 'search', text: 'Skip to search' },
    { target: 'footer', text: 'Skip to footer' },
  ];

  return (
    <div className="skip-links-container" role="navigation" aria-label="Skip links">
      {skipLinks.map((link) => (
        <SkipLink key={link.target} targetId={link.target}>
          {link.text}
        </SkipLink>
      ))}
    </div>
  );
};

// Skip link for specific sections
export const SectionSkipLink: React.FC<{ 
  section: string; 
  targetId: string; 
  className?: string;
}> = ({ section, targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`section-skip-link ${className}`}
    >
      Skip to {section}
    </SkipLink>
  );
};

// Skip link for forms
export const FormSkipLink: React.FC<{ 
  formName: string; 
  targetId: string; 
  className?: string;
}> = ({ formName, targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`form-skip-link ${className}`}
    >
      Skip to {formName} form
    </SkipLink>
  );
};

// Skip link for tables
export const TableSkipLink: React.FC<{ 
  tableName: string; 
  targetId: string; 
  className?: string;
}> = ({ tableName, targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`table-skip-link ${className}`}
    >
      Skip to {tableName} table
    </SkipLink>
  );
};

// Skip link for lists
export const ListSkipLink: React.FC<{ 
  listName: string; 
  targetId: string; 
  className?: string;
}> = ({ listName, targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`list-skip-link ${className}`}
    >
      Skip to {listName} list
    </SkipLink>
  );
};

// Skip link for interactive elements
export const InteractiveSkipLink: React.FC<{ 
  elementName: string; 
  targetId: string; 
  className?: string;
}> = ({ elementName, targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`interactive-skip-link ${className}`}
    >
      Skip to {elementName}
    </SkipLink>
  );
};

// Skip link for media content
export const MediaSkipLink: React.FC<{ 
  mediaType: string; 
  targetId: string; 
  className?: string;
}> = ({ mediaType, targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`media-skip-link ${className}`}
    >
      Skip to {mediaType}
    </SkipLink>
  );
};

// Skip link for advertisements
export const AdSkipLink: React.FC<{ 
  targetId: string; 
  className?: string;
}> = ({ targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`ad-skip-link ${className}`}
    >
      Skip advertisement
    </SkipLink>
  );
};

// Skip link for sidebar content
export const SidebarSkipLink: React.FC<{ 
  sidebarName: string; 
  targetId: string; 
  className?: string;
}> = ({ sidebarName, targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`sidebar-skip-link ${className}`}
    >
      Skip to {sidebarName} sidebar
    </SkipLink>
  );
};

// Skip link for modal content
export const ModalSkipLink: React.FC<{ 
  modalName: string; 
  targetId: string; 
  className?: string;
}> = ({ modalName, targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`modal-skip-link ${className}`}
    >
      Skip to {modalName} modal
    </SkipLink>
  );
};

// Skip link for breadcrumbs
export const BreadcrumbSkipLink: React.FC<{ 
  targetId: string; 
  className?: string;
}> = ({ targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`breadcrumb-skip-link ${className}`}
    >
      Skip to breadcrumb navigation
    </SkipLink>
  );
};

// Skip link for pagination
export const PaginationSkipLink: React.FC<{ 
  targetId: string; 
  className?: string;
}> = ({ targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`pagination-skip-link ${className}`}
    >
      Skip to pagination
    </SkipLink>
  );
};

// Skip link for filters
export const FilterSkipLink: React.FC<{ 
  filterName: string; 
  targetId: string; 
  className?: string;
}> = ({ filterName, targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`filter-skip-link ${className}`}
    >
      Skip to {filterName} filters
    </SkipLink>
  );
};

// Skip link for sorting options
export const SortSkipLink: React.FC<{ 
  targetId: string; 
  className?: string;
}> = ({ targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`sort-skip-link ${className}`}
    >
      Skip to sorting options
    </SkipLink>
  );
};

// Skip link for help content
export const HelpSkipLink: React.FC<{ 
  targetId: string; 
  className?: string;
}> = ({ targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`help-skip-link ${className}`}
    >
      Skip to help content
    </SkipLink>
  );
};

// Skip link for contact information
export const ContactSkipLink: React.FC<{ 
  targetId: string; 
  className?: string;
}> = ({ targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`contact-skip-link ${className}`}
    >
      Skip to contact information
    </SkipLink>
  );
};

// Skip link for legal information
export const LegalSkipLink: React.FC<{ 
  targetId: string; 
  className?: string;
}> = ({ targetId, className = '' }) => {
  return (
    <SkipLink 
      targetId={targetId} 
      className={`legal-skip-link ${className}`}
    >
      Skip to legal information
    </SkipLink>
  );
};
