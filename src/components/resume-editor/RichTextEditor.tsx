import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

/**
 * TipTap-powered rich text editor used for the bullets and the summary.
 * Outputs HTML; export utilities strip tags before writing PDF/DOCX/TXT.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 22,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        codeBlock: false,
        blockquote: false,
      }),
      Placeholder.configure({ placeholder: placeholder || "" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none text-foreground leading-snug",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // TipTap emits <p></p> for empty content — collapse that to "".
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    const current = editor.getHTML();
    if (current !== (value || "<p></p>") && current !== value) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  return (
    <EditorContent
      editor={editor}
      className={cn(
        "rounded px-0.5 -mx-0.5 hover:bg-accent/5 focus-within:bg-accent/10 transition-colors",
        className,
      )}
      style={{ minHeight }}
    />
  );
}
