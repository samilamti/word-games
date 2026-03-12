import { useState } from 'react';
import { saveFeedback } from '../beta/feedbackService.ts';
import type { BetaFeedback } from '../types/index.ts';

const CATEGORIES: { value: BetaFeedback['category']; label: string }[] = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'word', label: 'Word Issue' },
  { value: 'other', label: 'Other' },
];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<BetaFeedback['category']>('suggestion');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) return;
    saveFeedback({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      category,
      message: message.trim(),
      timestamp: Date.now(),
    });
    setMessage('');
    setCategory('suggestion');
    setOpen(false);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          padding: '10px 18px',
          fontSize: 13,
          fontWeight: 'bold',
          backgroundColor: '#1e1e36',
          color: '#ff9800',
          border: '1px solid #ff9800',
          borderRadius: 20,
          cursor: 'pointer',
          zIndex: 50,
          opacity: 0.85,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
      >
        Beta Feedback
      </button>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 70,
            right: 20,
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 'bold',
            zIndex: 300,
          }}
        >
          Thanks for your feedback!
        </div>
      )}

      {/* Modal */}
      {open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              padding: '32px 40px',
              backgroundColor: '#1e1e36',
              borderRadius: 12,
              border: '2px solid #3a3a5c',
              maxWidth: 440,
              width: '90%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', color: '#ffd54f', fontSize: 20 }}>
              Beta Feedback
            </h3>

            <label style={{ display: 'block', color: '#aaa', fontSize: 12, marginBottom: 6 }}>
              Category
            </label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 13,
                    backgroundColor: category === cat.value ? '#ff9800' : '#16162a',
                    color: category === cat.value ? '#fff' : '#aaa',
                    border: `1px solid ${category === cat.value ? '#ff9800' : '#3a3a5c'}`,
                    borderRadius: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <label style={{ display: 'block', color: '#aaa', fontSize: 12, marginBottom: 6 }}>
              Your feedback
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              rows={4}
              style={{
                width: '100%',
                padding: 10,
                backgroundColor: '#16162a',
                color: '#e0e0e0',
                border: '1px solid #3a3a5c',
                borderRadius: 6,
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: '8px 20px',
                  fontSize: 14,
                  backgroundColor: '#333',
                  color: '#ccc',
                  border: '1px solid #555',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!message.trim()}
                style={{
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 'bold',
                  backgroundColor: message.trim() ? '#ff9800' : '#555',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: message.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
