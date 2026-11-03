import React, { useRef, useState } from 'react';
import type { CardConfig } from '../config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: CardConfig;
  photoUrl: string | null;
  onSave: (config: CardConfig, photoUrl: string | null) => void;
  onReset: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  config,
  photoUrl,
  onSave,
  onReset,
}: Props) {
  const [name, setName] = useState(config.birthdayName);
  const [message, setMessage] = useState(config.birthdayMessage);
  const [secondary, setSecondary] = useState(config.secondaryMessage);
  const [signature, setSignature] = useState(config.signature);
  const [duration, setDuration] = useState(config.paintingDuration);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(photoUrl);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleSave = () => {
    onSave(
      {
        birthdayName: name.trim() || config.birthdayName,
        birthdayMessage: message.trim() || config.birthdayMessage,
        secondaryMessage: secondary.trim() || config.secondaryMessage,
        signature: signature.trim(),
        paintingDuration: duration,
      },
      previewPhoto
    );
    onClose();
  };

  const handleResetToDefault = () => {
    onReset();
    setPreviewPhoto(null);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-paper" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close settings"
        >
          ×
        </button>

        <h2 id="modal-title" className="modal-title">
          Card Settings
        </h2>
        <p className="modal-subtitle">
          Personalize the greeting and upload a photo to create a live painted portrait.
        </p>

        <div className="modal-content">
          {/* Portrait Photo */}
          <div className="modal-section">
            <label className="modal-label">Portrait Photo</label>
            <div
              className={`dropzone ${dragOver ? 'is-dragover' : ''} ${
                previewPhoto ? 'has-photo' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden-file-input"
                onChange={handleFileChange}
              />
              {previewPhoto ? (
                <div className="preview-container">
                  <img
                    src={previewPhoto}
                    alt="Portrait preview"
                    className="preview-img"
                  />
                  <div className="preview-actions">
                    <span className="text-button small">Change photo</span>
                    <button
                      type="button"
                      className="text-button small remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewPhoto(null);
                      }}
                    >
                      Use default portrait
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dropzone-prompt">
                  <svg
                    className="dropzone-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <p>
                    <strong>Click or drag &amp; drop a photo here</strong>
                  </p>
                  <span>A vertical close-up portrait of the person works best</span>
                </div>
              )}
            </div>
          </div>

          {/* Name and greeting */}
          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label" htmlFor="field-name">
                Birthday person's name
              </label>
              <input
                id="field-name"
                type="text"
                className="modal-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
              />
            </div>

            <div className="modal-field">
              <label className="modal-label" htmlFor="field-message">
                Main greeting phrase
              </label>
              <input
                id="field-message"
                type="text"
                className="modal-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Happy Birthday!"
              />
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="field-secondary">
              Greeting note message
            </label>
            <textarea
              id="field-secondary"
              rows={2}
              className="modal-input modal-textarea"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              placeholder="May this year be as wonderful and luminous as this moment."
            />
          </div>

          <div className="modal-grid">
            <div className="modal-field">
              <label className="modal-label" htmlFor="field-signature">
                Painting signature
              </label>
              <input
                id="field-signature"
                type="text"
                className="modal-input"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="with love, 2026"
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Painting speed</label>
              <div className="speed-buttons">
                <button
                  type="button"
                  className={`speed-btn ${duration === 17000 ? 'active' : ''}`}
                  onClick={() => setDuration(17000)}
                >
                  Normal (17s)
                </button>
                <button
                  type="button"
                  className={`speed-btn ${duration === 10000 ? 'active' : ''}`}
                  onClick={() => setDuration(10000)}
                >
                  Faster (10s)
                </button>
                <button
                  type="button"
                  className={`speed-btn ${duration === 6000 ? 'active' : ''}`}
                  onClick={() => setDuration(6000)}
                >
                  Express (6s)
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="text-button secondary-btn"
            onClick={handleResetToDefault}
          >
            Reset to defaults
          </button>
          <div className="modal-actions-right">
            <button
              type="button"
              className="text-button cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary-action-btn"
              onClick={handleSave}
            >
              Save &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
