'use client';

import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ButtonPrimary } from '@/components/ui/ButtonPrimary';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const form = e.currentTarget;
    const formDataObj = new FormData(form);
    
    try {
      const response = await fetch('https://formsubmit.co/ajax/Accountability-Agent@googlegroups.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          _captcha: false,
          _template: 'box',
          _subject: `Contact Form: ${formData.subject}`
        })
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        alert('Failed to send message. Please try again or email us directly.');
      }
    } catch (error) {
      console.error('Error sending form:', error);
      alert('Failed to send message. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <SectionLabel>Contact Us</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-light tracking-tighter mb-6">
            Get in <span className="text-emerald-500 font-serif italic font-light">Touch</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Have a question, suggestion, or need support? We'd love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-light mb-6">Contact Information</h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                Reach out to us through any of these channels. We typically respond within 24-48 hours.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 border border-white/10 bg-white/[0.01] rounded-xl">
                <Mail className="w-6 h-6 text-emerald-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">Email</h3>
                  <a 
                    href="mailto:Accountability-Agent@googlegroups.com" 
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Accountability-Agent@googlegroups.com
                  </a>
                  <p className="text-xs text-gray-500 mt-2">For general inquiries and support</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border border-white/10 bg-white/[0.01] rounded-xl">
                <MessageSquare className="w-6 h-6 text-emerald-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-1">Social Media</h3>
                  <a 
                    href="https://x.com/CommitMint" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    @CommitMint on X
                  </a>
                  <p className="text-xs text-gray-500 mt-2">Follow us for updates and announcements</p>
                </div>
              </div>
            </div>

            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Response Time</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                We aim to respond to all inquiries within 24-48 hours during business days. 
                For urgent matters, please include "URGENT" in your subject line.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <div className="p-8 border border-white/10 bg-white/[0.01] rounded-xl">
              <h2 className="text-2xl font-light mb-6">Send us a Message</h2>
              
              {submitted ? (
                <div className="p-6 border border-emerald-500/50 bg-emerald-500/10 rounded-lg">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                      <p className="font-medium mb-1">Message Sent!</p>
                      <p className="text-sm text-emerald-300/80">
                        Thank you for contacting us. We'll get back to you soon.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      required
                      className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="What's this about?"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      required
                      rows={6}
                      className="w-full bg-transparent border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      placeholder="Tell us what's on your mind..."
                    />
                  </div>

                  <ButtonPrimary 
                    type="submit" 
                    disabled={loading}
                    className="w-full"
                    icon={loading ? undefined : Send}
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </ButtonPrimary>
                </form>
              )}
            </div>

          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 pt-12 border-t border-white/10">
          <h2 className="text-2xl font-light mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-2 text-emerald-400">How do I get started?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Simply connect your Phantom wallet, browse available challenges, or create your own. 
                Put down your stake and start verifying your progress daily.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-2 text-emerald-400">Is my money safe?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Yes. Your funds are locked in smart contracts on the Solana blockchain. 
                No one, including us, can access your staked SOL until the challenge ends.
              </p>
            </div>
            <div className="p-6 border border-white/10 bg-white/[0.01] rounded-xl">
              <h3 className="text-lg font-medium mb-2 text-emerald-400">What if I have a technical issue?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Contact us through this form or email Accountability-Agent@googlegroups.com. 
                Include as much detail as possible about the issue you're experiencing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

