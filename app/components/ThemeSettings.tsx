'use client';

import { useState } from 'react';
import { THEMES, type ThemeId } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

function ThemePreview({ theme }: { theme: ThemeId }) {
  return (
    <div className={`theme-preview theme-preview-${theme}`} aria-hidden="true">
      <div className="preview-topbar">
        <span className="preview-dots"><i /><i /><i /></span>
        <span>THINK STORAGE</span>
        <span className="preview-symbol">{theme === 'terminal' ? '>_' : theme === 'farm' ? '✿' : 'Aa'}</span>
      </div>
      <div className="preview-body">
        <div className="preview-sidebar"><span /><span /><span /><span /></div>
        <div className="preview-lines">
          <span className="preview-label">{theme === 'terminal' ? '> MY WRITING' : 'MY WRITING'}</span>
          <span className="preview-line" />
          <span className="preview-line" />
          <div className="preview-cards"><span className="preview-card" /><span className="preview-card" /></div>
          <span className="preview-line" />
        </div>
      </div>
    </div>
  );
}

export default function ThemeSettings() {
  const { theme, ready, selectTheme } = useTheme();
  const [feedback, setFeedback] = useState<{ theme: ThemeId; message: string } | null>(null);

  function choose(next: ThemeId, name: string) {
    const saved = selectTheme(next);
    setFeedback({
      theme: next,
      message: saved
        ? `‘${name}’ UI가 적용되고 저장되었습니다.`
        : `‘${name}’ UI를 적용했습니다. 브라우저 저장이 차단되어 새로고침하면 초기화될 수 있습니다.`,
    });
  }

  return (
    <section aria-labelledby="ui-settings-heading">
      <fieldset aria-describedby="theme-help" disabled={!ready}>
        <legend id="ui-settings-heading" className="settings-heading">UI 설정</legend>
        <p id="theme-help" className="settings-intro">마음에 드는 화면을 골라보세요. 선택하면 바로 적용됩니다.</p>
        <div className="theme-grid">
          {THEMES.map((option, index) => (
            <label key={option.id} className="theme-option" data-preview={option.id} data-selected={ready && theme === option.id}>
              <input
                className="theme-radio"
                type="radio"
                name="ui-theme"
                value={option.id}
                checked={theme === option.id}
                onChange={() => choose(option.id, option.name)}
                aria-labelledby={`theme-title-${option.id}`}
                aria-describedby={`theme-description-${option.id}`}
              />
              <span className="theme-option-top">
                <span className="theme-option-number">0{index + 1}</span>
                <span className="theme-option-check" aria-hidden="true">{theme === option.id ? '✓' : ''}</span>
              </span>
              <ThemePreview theme={option.id} />
              <span className="theme-option-footer">
                <span className="theme-option-kind">{option.caption}</span>
                <span className="theme-option-title" id={`theme-title-${option.id}`}>{option.name}</span>
                <span className="theme-option-description" id={`theme-description-${option.id}`}>{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="theme-status" role="status" aria-live="polite" aria-atomic="true">
        {feedback?.theme === theme ? feedback.message : (ready ? `현재 ‘${THEMES.find((option) => option.id === theme)?.name}’ UI를 사용하고 있어요.` : '화면 설정을 불러오는 중…')}
      </p>
      <p className="settings-note">선택한 UI는 이 브라우저에 저장됩니다. 다른 기기에서는 따로 선택해 주세요.</p>
    </section>
  );
}
