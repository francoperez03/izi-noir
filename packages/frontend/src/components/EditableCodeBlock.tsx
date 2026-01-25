import { useRef, useEffect } from 'react';
import { Highlight, themes } from 'prism-react-renderer';

interface EditableCodeBlockProps {
  code: string;
  onChange: (code: string) => void;
  language?: 'typescript' | 'javascript';
  rows?: number;
}

export function EditableCodeBlock({
  code,
  onChange,
  language = 'javascript',
  rows = 6,
}: EditableCodeBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Sync scroll between textarea and highlighted code
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Auto-resize based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, rows * 24)}px`;
    }
  }, [code, rows]);

  return (
    <div className="editable-code-block">
      {/* Highlighted code overlay */}
      <Highlight theme={themes.nightOwl} code={code} language={language}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            ref={preRef}
            className="code-highlight-overlay"
            style={{ ...style, background: 'transparent' }}
            aria-hidden="true"
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>

      {/* Invisible textarea for editing */}
      <textarea
        ref={textareaRef}
        className="code-textarea-input"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        rows={rows}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  );
}
