import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, UnderlineIcon, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Heading3, Link as LinkIcon, Unlink, Undo2, Redo2,
  IndentDecrease, IndentIncrease, Quote, Code,
} from "lucide-react";
import { useCallback, useEffect } from "react";

const COLORS = ["#ffffff", "#facc15", "#f97316", "#ef4444", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#94a3b8"];

interface Props {
  value: string;
  onChange?: (html: string) => void;
  editable?: boolean;
}

export function RichTextEditor({ value, onChange, editable = true }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener", target: "_blank" }, validate: (href) => /^https?:\/\//i.test(href) }),
    ],
    content: value || "<p></p>",
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="tiptap-editor rounded-xl border border-border bg-card">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL del link", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const Btn = ({ onClick, active, disabled, children, title }: any) => (
    <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={disabled}
      title={title}
      className={`h-8 w-8 p-0 ${active ? "bg-accent text-foreground" : "text-muted-foreground"}`}>
      {children}
    </Button>
  );

  return (
    <div className="sticky top-16 z-20 flex flex-wrap items-center gap-1 border-b border-border bg-card/95 backdrop-blur px-2 py-1.5 rounded-t-xl">
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strike"><Strikethrough className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Code"><Code className="h-4 w-4" /></Btn>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1"><Heading1 className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3"><Heading3 className="h-4 w-4" /></Btn>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list"><ListOrdered className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().sinkListItem("listItem").run()} title="Indent"><IndentIncrease className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().liftListItem("listItem").run()} title="Outdent"><IndentDecrease className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote"><Quote className="h-4 w-4" /></Btn>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Btn onClick={setLink} active={editor.isActive("link")} title="Link"><LinkIcon className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")} title="Remove link"><Unlink className="h-4 w-4" /></Btn>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <div className="flex items-center gap-1 px-1">
        {COLORS.map((c) => (
          <button key={c} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setColor(c).run()}
            title={c}
            className="h-5 w-5 rounded-full border border-border hover:scale-110 transition-transform" style={{ background: c }} />
        ))}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().unsetColor().run()}
          title="Rimuovi colore"
          className="ml-1 text-xs text-muted-foreground hover:text-foreground">×</button>
      </div>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo2 className="h-4 w-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo2 className="h-4 w-4" /></Btn>
    </div>
  );
}
