'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E10600]/10 via-transparent to-black/[0.03]" />
        <div className="mx-auto max-w-6xl px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Test Buddy
              <span className="block text-[#E10600]">Turn your notes into practice tests.</span>
            </h1>
            <p className="mt-4 text-lg text-black/70">
              Upload a study guide or screenshot. Get a quiz in seconds—plus smart feedback on what to improve.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/dashboard" prefetch className="rounded-lg bg-black text-white px-5 py-3 font-semibold hover:opacity-90 transition-opacity">
                Get Started Free
              </Link>
              <Link href="/dashboard" className="rounded-lg border border-black/15 px-5 py-3 font-semibold hover:bg-black/5 transition-colors">
                Try a Demo
              </Link>
            </div>
            <p className="mt-3 text-sm text-black/50">No credit card required.</p>
          </div>

          <div className="flex justify-center md:justify-end">
            <Image
              src="/assets/test-buddy-mascot.svg"
              alt="Test Buddy mascot"
              width={360}
              height={360}
              priority
              className="drop-shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-center text-black/70 mb-12">Three simple steps to turn your study materials into practice tests</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card
            step="1"
            title="Upload"
            desc="Drop in a PDF, text, or a screenshot of your notes."
            img="/assets/upload.png"
            video="/assets/UploadandTestCreate.webm"
          />
          <Card
            step="2"
            title="Generate"
            desc="Create a mixed quiz (multiple-choice + short answer)."
            img="/assets/quiz-setup.png"
            video="/assets/AIGenerate.webm"
          />
          <Card
            step="3"
            title="Review"
            desc="See AI feedback on what to fix next and why."
            img="/assets/ai-feedback.png"
          />
        </div>
      </section>

      {/* SCREENSHOTS SHOWCASE */}
      <section className="bg-[#F5F5F5]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">See it in action</h2>
          <p className="text-center text-black/70 mb-12">Real screenshots from the Test Buddy experience</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ScreenshotCard
              img="/assets/processing.png"
              title="Processing"
              desc="AI analyzes your content and structures questions"
            />
            <ScreenshotCard
              img="/assets/question.png"
              title="Interactive Quiz"
              desc="Take quizzes with multiple question types"
            />
            <ScreenshotCard
              img="/assets/ai-feedback.png"
              title="Smart Feedback"
              desc="Get detailed explanations of your mistakes"
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#0B0B0B] text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Built for real studying</h2>
          <p className="text-center text-white/70 mb-12">Everything you need to turn study materials into effective practice</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              ['Auto-generated quizzes', 'Turn files into questions instantly.'],
              ['AI feedback', 'Understand mistakes with quick explanations.'],
              ['Folders by class', 'Keep SDLC, CISSP, and more organized.'],
              ['Metrics', 'Track attempts, accuracy, and time.'],
              ['Mobile-friendly', 'Practice anywhere.'],
              ['OCR (Pro)', 'Extract text from photos and screenshots.'],
            ].map(([title, desc]) => (
              <li key={title} className="rounded-xl border border-white/10 p-5 bg-white/5 hover:bg-white/10 transition-colors">
                <div className="text-lg font-semibold">{title}</div>
                <div className="text-white/70 mt-1">{desc}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PLANS */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Pick a plan</h2>
        <p className="text-center text-black/70 mb-12">Start free, upgrade when you need more</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PlanCard name="Free" price="$0" cta="/dashboard" bullets={['1–3 tests', 'Basic quizzes', 'Save results']} />
          <PlanCard name="Student" price="$5" cta="/dashboard" highlight bullets={['More tests', 'Folders', 'Email/Google login']} />
          <PlanCard name="Pro" price="$15" cta="/dashboard" bullets={['Unlimited', 'AI feedback', 'OCR (4o-mini)']} />
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F5F5F5]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Frequently asked questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Faq q="What files work?" a="PDFs, text, and images/screenshots. Pro adds OCR for images." />
            <Faq q="Can I cancel anytime?" a="Yes. Plans are month-to-month." />
            <Faq q="Is data private?" a="Yes. Your files are yours; you can delete them anytime." />
            <Faq q="Do I need an account?" a="Free plan requires sign-in to save and come back later." />
            <Faq q="How accurate is the AI?" a="We use GPT-4o-mini for reliable question generation and feedback." />
            <Faq q="Can I study on mobile?" a="Yes! Test Buddy works great on phones and tablets." />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 text-center text-sm text-black/60 border-t border-black/10">
        © {new Date().getFullYear()} Test Buddy by YourBuddyApps • <Link href="/privacy" className="underline hover:text-black">Privacy</Link> • <Link href="/terms" className="underline hover:text-black">Terms</Link>
      </footer>
    </main>
  );
}

function Card({ step, title, desc, img, video }: { step: string; title: string; desc: string; img: string; video?: string }) {
  return (
    <div className="rounded-xl border border-black/10 overflow-hidden bg-white hover:shadow-lg transition-shadow">
      <div className="p-5">
        <div className="text-[#E10600] font-bold">Step {step}</div>
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-black/70 mt-1">{desc}</div>
      </div>
      <div className="relative aspect-[16/10]">
        {video ? (
          <video 
            autoPlay 
            muted 
            loop 
            playsInline 
            className="w-full h-full object-cover" 
            preload="metadata" 
            poster={img}
          >
            <source src={video} type="video/webm" />
            <Image src={img} alt={title} fill className="object-cover" loading="lazy" />
          </video>
        ) : (
          <Image src={img} alt={title} fill className="object-cover" loading="lazy" />
        )}
      </div>
    </div>
  );
}

function ScreenshotCard({ img, title, desc }: { img: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-black/10 overflow-hidden bg-white hover:shadow-lg transition-shadow">
      <div className="relative aspect-[16/10]">
        <Image src={img} alt={title} fill className="object-cover" loading="lazy" />
      </div>
      <div className="p-4">
        <div className="font-semibold">{title}</div>
        <div className="text-black/70 text-sm mt-1">{desc}</div>
      </div>
    </div>
  );
}

function PlanCard({
  name, price, cta, bullets, highlight
}: { name: string; price: string; cta: string; bullets: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-6 border transition-all hover:shadow-lg ${highlight ? 'border-[#E10600] shadow-[0_0_0_3px_rgba(225,6,0,0.1)] scale-105' : 'border-black/10'}`}>
      <div className="text-xl font-bold">{name}</div>
      <div className="text-3xl font-extrabold mt-2">{price}<span className="text-base font-medium text-black/50">/mo</span></div>
      <ul className="mt-4 space-y-2 text-black/80">
        {bullets.map(b => <li key={b} className="flex items-start"><span className="text-[#E10600] mr-2">•</span> {b}</li>)}
      </ul>
      <Link href={cta} className={`mt-6 inline-block rounded-lg px-5 py-3 font-semibold transition-colors ${highlight ? 'bg-[#E10600] text-white hover:bg-[#E10600]/90' : 'border border-black/15 hover:bg-black/5'}`}>
        Choose {name}
      </Link>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-black/10 p-5 bg-white hover:shadow-md transition-shadow">
      <div className="font-semibold text-[#E10600]">{q}</div>
      <div className="text-black/70 mt-2">{a}</div>
    </div>
  );
}
