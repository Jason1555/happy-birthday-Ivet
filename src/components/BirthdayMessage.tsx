import { CONFIG, type CardConfig } from '../config';

interface Props {
  visible: boolean;
  onReplay: () => void;
  config?: CardConfig;
  onCustomize?: () => void;
}

export function BirthdayMessage({ visible, onReplay, config, onCustomize }: Props) {
  const name = config?.birthdayName ?? CONFIG.birthdayName;
  const mainMsg = config?.birthdayMessage ?? CONFIG.birthdayMessage;
  const secondaryMsg = config?.secondaryMessage ?? CONFIG.secondaryMessage;

  return (
    <aside
      className={`note ${visible ? 'is-visible' : ''}`}
      aria-live="polite"
      aria-hidden={!visible}
    >
      <span className="tape" aria-hidden="true" />
      <p className="note-to">{name},</p>
      <h2>{mainMsg}</h2>
      <p className="note-text">{secondaryMsg}</p>
      <div className="note-buttons">
        <button
          className="text-button replay"
          onClick={onReplay}
          tabIndex={visible ? 0 : -1}
        >
          Watch again
        </button>
      </div>
    </aside>
  );
}
