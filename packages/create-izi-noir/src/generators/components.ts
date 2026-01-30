export function generateCodeBlock(): string {
  return `import { Highlight, themes } from 'prism-react-renderer';

interface CodeBlockProps {
  code: string;
  language?: 'typescript' | 'javascript' | 'rust';
}

export function CodeBlock({ code, language = 'typescript' }: CodeBlockProps) {
  return (
    <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={className}
          style={{
            ...style,
            padding: '1rem',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '0.875rem',
            lineHeight: '1.5',
          }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              <span style={{ color: '#666', marginRight: '1rem', userSelect: 'none' }}>
                {String(i + 1).padStart(2, ' ')}
              </span>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
`;
}

export function generateEditableCodeBlock(): string {
  return `import { useRef, useEffect, useState } from 'react';
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
  language = 'typescript',
  rows = 8,
}: EditableCodeBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  const handleScroll = () => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
    }
  };

  const lineHeight = 1.5;
  const padding = 16;
  const minHeight = rows * 14 * lineHeight + padding * 2;

  return (
    <div style={{ position: 'relative', minHeight }}>
      <Highlight theme={themes.nightOwl} code={code} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            ref={preRef}
            className={className}
            style={{
              ...style,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: '1rem',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              margin: 0,
              pointerEvents: 'none',
            }}
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

      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          minHeight,
          padding: '1rem',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: 'transparent',
          caretColor: 'white',
          WebkitTextFillColor: 'transparent',
        }}
      />
    </div>
  );
}
`;
}
