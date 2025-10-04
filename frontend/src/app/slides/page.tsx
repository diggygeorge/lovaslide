"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
   Bot,
   CheckCircle,
   ChevronDown,
   ChevronLeft,
   ChevronRight,
   ChevronUp,
   Download,
   FileText,
   History,
   LayoutDashboard,
   Loader2,
   MessageSquare,
   Play,
   Presentation,
   Send,
   Sparkles,
} from "lucide-react";

const BASE_FONT_STACK =
   "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

type DeckMeta = {
   title: string;
   theme: "dark" | "light" | "blue" | "green" | "purple" | "corporate";
};

type SlideMedia = {
   kind: "image";
   url: string;
   alt?: string;
};

type DeckSlide = {
   layout:
      | "title"
      | "title-bullets"
      | "two-col"
      | "image-left"
      | "image-right"
      | "roadmap"
      | "quote"
      | "comparison"
      | "stats"
      | "three-col";
   title: string;
   bullets?: string[];
   notes?: string;
   media?: SlideMedia[];
   quote?: string;
   author?: string;
   stats?: Array<{ label: string; value: string; description?: string }>;
   comparison?: {
      left: { title: string; items: string[] };
      right: { title: string; items: string[] };
   };
};

type SlideWithStatus = DeckSlide & {
   id: number;
   status: string;
};

type ThemeConfig = {
   background: string;
   gradient: [string, string];
   panel: string;
   panelStroke: string;
   accent: string;
   accentSoft: string;
   textPrimary: string;
   textSecondary: string;
   metaText: string;
   bullet: string;
   watermark: string;
};

const themePalette: Record<DeckMeta["theme"], ThemeConfig> = {
   dark: {
      background: "#040714",
      gradient: ["rgba(56,189,248,0.16)", "rgba(147,51,234,0.14)"],
      panel: "rgba(15,23,42,0.76)",
      panelStroke: "rgba(148,163,184,0.20)",
      accent: "#38bdf8",
      accentSoft: "rgba(14,165,233,0.18)",
      textPrimary: "#f1f5f9",
      textSecondary: "rgba(226,232,240,0.88)",
      metaText: "rgba(148,163,184,0.92)",
      bullet: "#f8fafc",
      watermark: "rgba(15,23,42,0.68)",
   },
   light: {
      background: "#f8fafc",
      gradient: ["rgba(59,130,246,0.14)", "rgba(236,72,153,0.12)"],
      panel: "rgba(255,255,255,0.82)",
      panelStroke: "rgba(15,23,42,0.1)",
      accent: "#0f172a",
      accentSoft: "rgba(37,99,235,0.12)",
      textPrimary: "#0f172a",
      textSecondary: "rgba(15,23,42,0.82)",
      metaText: "rgba(71,85,105,0.88)",
      bullet: "#1e293b",
      watermark: "rgba(15,23,42,0.06)",
   },
   blue: {
      background: "#0c1821",
      gradient: ["rgba(59,130,246,0.25)", "rgba(99,102,241,0.20)"],
      panel: "rgba(30,58,138,0.85)",
      panelStroke: "rgba(96,165,250,0.30)",
      accent: "#60a5fa",
      accentSoft: "rgba(96,165,250,0.25)",
      textPrimary: "#e0f2fe",
      textSecondary: "rgba(186,230,253,0.90)",
      metaText: "rgba(125,211,252,0.85)",
      bullet: "#f0f9ff",
      watermark: "rgba(30,58,138,0.75)",
   },
   green: {
      background: "#0a1b0e",
      gradient: ["rgba(34,197,94,0.22)", "rgba(16,185,129,0.18)"],
      panel: "rgba(21,128,61,0.80)",
      panelStroke: "rgba(74,222,128,0.25)",
      accent: "#4ade80",
      accentSoft: "rgba(74,222,128,0.20)",
      textPrimary: "#dcfce7",
      textSecondary: "rgba(187,247,208,0.88)",
      metaText: "rgba(134,239,172,0.85)",
      bullet: "#f0fdf4",
      watermark: "rgba(21,128,61,0.70)",
   },
   purple: {
      background: "#1a0f2e",
      gradient: ["rgba(168,85,247,0.24)", "rgba(236,72,153,0.18)"],
      panel: "rgba(88,28,135,0.82)",
      panelStroke: "rgba(196,181,253,0.28)",
      accent: "#c4b5fd",
      accentSoft: "rgba(196,181,253,0.22)",
      textPrimary: "#faf5ff",
      textSecondary: "rgba(221,214,254,0.90)",
      metaText: "rgba(196,181,253,0.85)",
      bullet: "#faf5ff",
      watermark: "rgba(88,28,135,0.75)",
   },
   corporate: {
      background: "#f8fafc",
      gradient: ["rgba(51,65,85,0.08)", "rgba(71,85,105,0.06)"],
      panel: "rgba(248,250,252,0.95)",
      panelStroke: "rgba(51,65,85,0.15)",
      accent: "#334155",
      accentSoft: "rgba(51,65,85,0.10)",
      textPrimary: "#0f172a",
      textSecondary: "rgba(51,65,85,0.85)",
      metaText: "rgba(71,85,105,0.80)",
      bullet: "#1e293b",
      watermark: "rgba(51,65,85,0.04)",
   },
};

const demoDeck: { meta: DeckMeta; slides: DeckSlide[] } = {
   meta: {
      title: "Enhanced Demo Deck",
      theme: "green",
   },
   slides: [
      {
         layout: "title",
         title: "Welcome to the Enhanced Demo",
         notes: "Set the tone and highlight the big promise upfront.",
      },
      {
         layout: "quote",
         title: "Inspiration",
         quote: "The best way to predict the future is to create it.",
         author: "Peter Drucker",
         notes: "Start with an inspiring quote to set the mood.",
      },
      {
         layout: "stats",
         title: "Market Impact",
         stats: [
            {
               label: "Users",
               value: "10M+",
               description: "Active monthly users",
            },
            {
               label: "Growth",
               value: "250%",
               description: "Year-over-year increase",
            },
            {
               label: "Satisfaction",
               value: "98%",
               description: "Customer satisfaction rate",
            },
            {
               label: "Revenue",
               value: "$50M",
               description: "Annual recurring revenue",
            },
         ],
         notes: "Use compelling statistics to build credibility.",
      },
      {
         layout: "comparison",
         title: "Before vs After",
         comparison: {
            left: {
               title: "Traditional Approach",
               items: [
                  "Manual processes",
                  "Siloed teams",
                  "Slow delivery",
                  "High costs",
               ],
            },
            right: {
               title: "Our Solution",
               items: [
                  "Automated workflows",
                  "Collaborative platform",
                  "Fast deployment",
                  "Cost effective",
               ],
            },
         },
         notes: "Clear comparison helps audience understand the value proposition.",
      },
      {
         layout: "image-right",
         title: "Product Demo",
         bullets: [
            "Intuitive user interface",
            "Real-time collaboration",
            "Advanced analytics",
            "Mobile responsive design",
         ],
         media: [
            {
               kind: "image",
               url: "https://placehold.co/800x600/png",
               alt: "Product Interface",
            },
         ],
         notes: "Show the product in action with key benefits.",
      },
      {
         layout: "three-col",
         title: "Key Features",
         bullets: [
            "Feature 1: Advanced AI integration",
            "Feature 2: Seamless integrations",
            "Feature 3: Enterprise security",
            "Feature 4: Custom branding",
            "Feature 5: Analytics dashboard",
            "Feature 6: Mobile apps",
         ],
         notes: "Break down features into digestible categories.",
      },
      {
         layout: "title-bullets",
         title: "Implementation Timeline",
         bullets: [
            "Week 1-2: Discovery & Planning",
            "Week 3-4: Setup & Configuration",
            "Week 5-6: Training & Testing",
            "Week 7-8: Launch & Support",
         ],
         notes: "Give clear expectations about the implementation process.",
      },
      {
         layout: "roadmap",
         title: "Future Roadmap",
         bullets: [
            "Q1: Enhanced AI capabilities",
            "Q2: Mobile app improvements",
            "Q3: Advanced integrations",
            "Q4: Enterprise features",
         ],
         notes: "Show the vision and commitment to continuous improvement.",
      },
      {
         layout: "two-col",
         title: "Success Stories",
         bullets: [
            "Company A: 300% productivity increase",
            "Company B: $2M cost savings",
            "Company C: 95% user adoption",
         ],
         notes: "Social proof through customer success stories.",
      },
      {
         layout: "quote",
         title: "Customer Testimonial",
         quote: "This platform transformed how our team collaborates and delivers results.",
         author: "Sarah Johnson, CTO at TechCorp",
         notes: "End with a powerful customer testimonial.",
      },
   ],
};

const slideStatuses = [
   "Ready",
   "In review",
   "Needs polish",
   "Draft",
   "Ready",
   "Ready",
   "In review",
   "Draft",
   "Ready",
   "Ready",
];

const defaultRecentNotes = [
   {
      id: 1,
      text: "Make the title more impactful and add customer testimonials",
      timestamp: "2 minutes ago",
      status: "completed" as const,
   },
   {
      id: 2,
      text: "Add more visual elements to support the three pillars",
      timestamp: "5 minutes ago",
      status: "pending" as const,
   },
];

type RecentNote = (typeof defaultRecentNotes)[number];

type ExportFormat = "pptx" | "pdf" | "google";

const formatLabels: Record<ExportFormat, string> = {
   pptx: "Export to PowerPoint",
   google: "Export to Google Slides",
   pdf: "Download as PDF",
};

async function loadSlideImage(url?: string): Promise<HTMLImageElement | null> {
   if (!url) return null;

   return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
   });
}

function fitText(
   ctx: CanvasRenderingContext2D,
   text: string,
   maxWidth: number,
   { maxSize, minSize, weight } = {
      maxSize: 68,
      minSize: 32,
      weight: 700,
   }
) {
   for (let size = maxSize; size >= minSize; size -= 2) {
      ctx.font = `${weight} ${size}px ${BASE_FONT_STACK}`;
      if (ctx.measureText(text).width <= maxWidth) {
         return size;
      }
   }
   return minSize;
}

function wrapLines(
   ctx: CanvasRenderingContext2D,
   text: string,
   maxWidth: number
): string[] {
   if (!text) return [];
   const words = text.split(/\s+/);
   const lines: string[] = [];
   let current = "";

   words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && current) {
         lines.push(current);
         current = word;
      } else {
         current = next;
      }
   });

   if (current) {
      lines.push(current);
   }

   return lines;
}

function drawRoundedRect(
   ctx: CanvasRenderingContext2D,
   x: number,
   y: number,
   width: number,
   height: number,
   radius: number,
   fill?: string,
   stroke?: string,
   strokeWidth = 1
) {
   const r = Math.min(radius, height / 2, width / 2);
   ctx.beginPath();
   ctx.moveTo(x + r, y);
   ctx.lineTo(x + width - r, y);
   ctx.quadraticCurveTo(x + width, y, x + width, y + r);
   ctx.lineTo(x + width, y + height - r);
   ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
   ctx.lineTo(x + r, y + height);
   ctx.quadraticCurveTo(x, y + height, x, y + height - r);
   ctx.lineTo(x, y + r);
   ctx.quadraticCurveTo(x, y, x + r, y);
   ctx.closePath();

   if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
   }

   if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
   }
}

function drawMetaHeader(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   meta: DeckMeta,
   theme: ThemeConfig,
   width: number
) {
   ctx.save();
   ctx.textBaseline = "top";
   ctx.textAlign = "left";
   ctx.fillStyle = theme.metaText;
   ctx.font = `600 18px ${BASE_FONT_STACK}`;
   ctx.fillText(meta.title.toUpperCase(), 56, 40);

   ctx.font = `500 13px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textSecondary;
   ctx.fillText(slide.layout.replace(/-/g, " ").toUpperCase(), 56, 68);

   const badgeWidth = 172;
   drawRoundedRect(
      ctx,
      width - badgeWidth - 56,
      36,
      badgeWidth,
      38,
      18,
      theme.panel,
      theme.panelStroke
   );
   ctx.textAlign = "center";
   ctx.fillStyle = theme.textSecondary;
   ctx.font = `600 14px ${BASE_FONT_STACK}`;
   ctx.fillText(
      `SLIDE ${String(slide.id).padStart(2, "0")}`,
      width - badgeWidth / 2 - 56,
      44
   );
   ctx.fillStyle = theme.metaText;
   ctx.font = `500 12px ${BASE_FONT_STACK}`;
   ctx.fillText(slide.status.toUpperCase(), width - badgeWidth / 2 - 56, 58);
   ctx.restore();
}

function drawAccentShapes(
   ctx: CanvasRenderingContext2D,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   const gradient = ctx.createRadialGradient(
      width * 0.78,
      height * 0.18,
      0,
      width * 0.78,
      height * 0.18,
      width * 0.48
   );
   gradient.addColorStop(0, theme.accentSoft);
   gradient.addColorStop(1, "rgba(56,189,248,0)");
   ctx.fillStyle = gradient;
   ctx.fillRect(0, 0, width, height);

   const gradient2 = ctx.createRadialGradient(
      width * 0.22,
      height * 0.82,
      0,
      width * 0.22,
      height * 0.82,
      width * 0.45
   );
   gradient2.addColorStop(0, "rgba(147,51,234,0.18)");
   gradient2.addColorStop(1, "rgba(147,51,234,0)");
   ctx.fillStyle = gradient2;
   ctx.fillRect(0, 0, width, height);

   ctx.globalAlpha = 0.35;
   drawRoundedRect(
      ctx,
      width * 0.12,
      height * 0.18,
      width * 0.16,
      height * 0.12,
      32,
      theme.watermark
   );
   drawRoundedRect(
      ctx,
      width * 0.68,
      height * 0.62,
      width * 0.18,
      height * 0.16,
      42,
      theme.watermark
   );
   ctx.restore();
}

function drawBulletedList(
   ctx: CanvasRenderingContext2D,
   bullets: string[] | undefined,
   x: number,
   y: number,
   maxWidth: number,
   lineHeight: number,
   theme: ThemeConfig
) {
   if (!bullets || bullets.length === 0) return y;

   const bulletIndent = 26;
   bullets.forEach((bullet) => {
      if (!bullet.trim()) return;
      const lines = wrapLines(ctx, bullet, maxWidth - bulletIndent);
      if (lines.length === 0) return;

      ctx.save();
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(x + 6, y + lineHeight / 2 - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = theme.textSecondary;
      ctx.textBaseline = "top";
      lines.forEach((line, index) => {
         ctx.fillText(line, x + bulletIndent, y + index * lineHeight);
      });
      ctx.restore();

      y += lineHeight * lines.length + 12;
   });
   return y;
}

async function drawTitleSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   meta: DeckMeta,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textAlign = "center";
   ctx.textBaseline = "top";

   const maxWidth = width * 0.72;
   const titleSize = fitText(ctx, slide.title, maxWidth, {
      maxSize: 78,
      minSize: 44,
      weight: 800,
   });
   ctx.font = `800 ${titleSize}px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textPrimary;
   const titleLines = wrapLines(ctx, slide.title, maxWidth);
   const titleHeight = titleLines.length * titleSize * 1.12;
   let y = (height - titleHeight) / 2;
   titleLines.forEach((line) => {
      ctx.fillText(line, width / 2, y);
      y += titleSize * 1.12;
   });

   ctx.font = `500 20px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.metaText;
   ctx.fillText(meta.title, width / 2, y + 24);
   ctx.restore();
}

async function drawTitleWithBullets(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textAlign = "left";
   ctx.textBaseline = "top";
   const paddingX = 96;
   const top = 144;
   const contentWidth = width - paddingX * 2;

   const titleSize = fitText(ctx, slide.title, contentWidth, {
      maxSize: 60,
      minSize: 34,
      weight: 700,
   });
   ctx.font = `700 ${titleSize}px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textPrimary;
   const titleLines = wrapLines(ctx, slide.title, contentWidth);
   let cursorY = top;
   titleLines.forEach((line) => {
      ctx.fillText(line, paddingX, cursorY);
      cursorY += titleSize * 1.12;
   });

   cursorY += 30;
   ctx.font = `500 28px ${BASE_FONT_STACK}`;
   drawBulletedList(
      ctx,
      slide.bullets,
      paddingX,
      cursorY,
      contentWidth,
      36,
      theme
   );
   ctx.restore();
}

async function drawTwoColumnSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textAlign = "left";
   ctx.textBaseline = "top";
   const paddingX = 80;
   const top = 140;
   const contentWidth = width - paddingX * 2;

   ctx.font = `700 54px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textPrimary;
   const titleLines = wrapLines(ctx, slide.title, contentWidth);
   let cursorY = top;
   titleLines.forEach((line) => {
      ctx.fillText(line, paddingX, cursorY);
      cursorY += 54 * 1.1;
   });

   cursorY += 18;

   const columnGap = 48;
   const columnWidth = (contentWidth - columnGap) * 0.55;
   ctx.font = `500 28px ${BASE_FONT_STACK}`;
   drawBulletedList(
      ctx,
      slide.bullets,
      paddingX,
      cursorY,
      columnWidth,
      34,
      theme
   );

   const notePanelX = paddingX + columnWidth + columnGap;
   const notePanelWidth = contentWidth - columnWidth - columnGap;
   const notePanelHeight = height * 0.42;

   drawRoundedRect(
      ctx,
      notePanelX,
      cursorY - 12,
      notePanelWidth,
      notePanelHeight,
      26,
      theme.panel,
      theme.panelStroke,
      1
   );

   ctx.font = `600 20px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textPrimary;
   ctx.fillText("Highlights", notePanelX + 28, cursorY + 12);

   ctx.font = `400 18px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textSecondary;
   const summary =
      slide.notes ?? "Summarize the impact of solving these pain points.";
   const lines = wrapLines(ctx, summary, notePanelWidth - 56);
   let textY = cursorY + 48;
   lines.forEach((line) => {
      ctx.fillText(line, notePanelX + 28, textY);
      textY += 26;
   });

   ctx.restore();
}

async function drawImageLeftSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textBaseline = "top";
   ctx.textAlign = "left";
   const paddingX = 72;
   const top = 120;

   const imageWidth = width * 0.36;
   const imageHeight = height * 0.56;
   const imageX = paddingX;
   const imageY = top + 20;

   const mediaItem = slide.media?.find((m) => m.kind === "image");
   const image = await loadSlideImage(mediaItem?.url);

   drawRoundedRect(
      ctx,
      imageX - 12,
      imageY - 12,
      imageWidth + 24,
      imageHeight + 24,
      34,
      theme.panel,
      theme.panelStroke,
      1
   );

   if (image) {
      ctx.save();
      const radius = 28;
      ctx.beginPath();
      ctx.moveTo(imageX + radius, imageY);
      ctx.lineTo(imageX + imageWidth - radius, imageY);
      ctx.quadraticCurveTo(
         imageX + imageWidth,
         imageY,
         imageX + imageWidth,
         imageY + radius
      );
      ctx.lineTo(imageX + imageWidth, imageY + imageHeight - radius);
      ctx.quadraticCurveTo(
         imageX + imageWidth,
         imageY + imageHeight,
         imageX + imageWidth - radius,
         imageY + imageHeight
      );
      ctx.lineTo(imageX + radius, imageY + imageHeight);
      ctx.quadraticCurveTo(
         imageX,
         imageY + imageHeight,
         imageX,
         imageY + imageHeight - radius
      );
      ctx.lineTo(imageX, imageY + radius);
      ctx.quadraticCurveTo(imageX, imageY, imageX + radius, imageY);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
      ctx.restore();
   } else {
      ctx.save();
      ctx.fillStyle = theme.accentSoft;
      ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
      ctx.fillStyle = theme.textSecondary;
      ctx.font = `500 18px ${BASE_FONT_STACK}`;
      ctx.textAlign = "center";
      ctx.fillText(
         mediaItem?.alt ?? "Image unavailable",
         imageX + imageWidth / 2,
         imageY + imageHeight / 2 - 12
      );
      ctx.restore();
   }

   const contentX = imageX + imageWidth + 72;
   const contentWidth = width - contentX - paddingX;

   ctx.fillStyle = theme.textPrimary;
   ctx.font = `700 52px ${BASE_FONT_STACK}`;
   const titleLines = wrapLines(ctx, slide.title, contentWidth);
   let cursorY = top;
   titleLines.forEach((line) => {
      ctx.fillText(line, contentX, cursorY);
      cursorY += 52 * 1.12;
   });

   cursorY += 20;
   ctx.font = `500 28px ${BASE_FONT_STACK}`;
   drawBulletedList(
      ctx,
      slide.bullets,
      contentX,
      cursorY,
      contentWidth,
      36,
      theme
   );

   ctx.restore();
}

async function drawRoadmapSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textAlign = "left";
   ctx.textBaseline = "top";

   const paddingX = 90;
   const top = 140;
   const contentWidth = width - paddingX * 2;

   ctx.font = `700 56px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textPrimary;
   const titleLines = wrapLines(ctx, slide.title, contentWidth);
   let cursorY = top;
   titleLines.forEach((line) => {
      ctx.fillText(line, paddingX, cursorY);
      cursorY += 56 * 1.08;
   });

   const steps = slide.bullets ?? [];
   const timelineTop = cursorY + 32;
   const timelineBottom = height - 180;
   const timelineHeight = timelineBottom - timelineTop;
   const stepCount = steps.length || 1;
   const stepGap = timelineHeight / Math.max(stepCount - 1, 1);

   ctx.save();
   ctx.strokeStyle = theme.panelStroke;
   ctx.lineWidth = 4;
   ctx.lineCap = "round";
   ctx.beginPath();
   ctx.moveTo(paddingX + 6, timelineTop);
   ctx.lineTo(paddingX + 6, timelineBottom);
   ctx.stroke();
   ctx.restore();

   ctx.font = `500 24px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textSecondary;
   steps.forEach((step, index) => {
      const y = timelineTop + stepGap * index;
      ctx.save();
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(paddingX + 6, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const badgeWidth = 120;
      drawRoundedRect(
         ctx,
         paddingX + 26,
         y - 16,
         badgeWidth,
         32,
         14,
         theme.panel,
         theme.panelStroke,
         1
      );
      ctx.save();
      ctx.fillStyle = theme.metaText;
      ctx.font = `600 14px ${BASE_FONT_STACK}`;
      ctx.fillText(`Phase ${index + 1}`, paddingX + 26 + badgeWidth / 2, y - 8);
      ctx.restore();

      const stepX = paddingX + 26 + badgeWidth + 24;
      const stepWidth = width - stepX - paddingX;
      const lines = wrapLines(ctx, step, stepWidth);
      let textY = y - 10;
      lines.forEach((line) => {
         ctx.fillText(line, stepX, textY);
         textY += 30;
      });
   });

   ctx.restore();
}

async function drawQuoteSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textAlign = "center";
   ctx.textBaseline = "top";
   const paddingX = 96;
   const top = 180;

   // Quote text
   ctx.font = `italic 48px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textPrimary;
   const quoteText = slide.quote || "Your quote here";
   const quoteLines = wrapLines(ctx, quoteText, width - paddingX * 2);
   let cursorY = top;
   quoteLines.forEach((line) => {
      ctx.fillText(line, width / 2, cursorY);
      cursorY += 56;
   });

   // Quote marks
   ctx.font = `bold 120px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.accent;
   ctx.globalAlpha = 0.3;
   ctx.fillText("\u201C", paddingX, top - 20);
   ctx.fillText("\u201D", width - paddingX - 60, cursorY - 40);

   ctx.globalAlpha = 1;

   // Author
   if (slide.author) {
      cursorY += 40;
      ctx.font = `600 24px ${BASE_FONT_STACK}`;
      ctx.fillStyle = theme.accent;
      ctx.fillText("— " + slide.author, width / 2, cursorY);
   }

   ctx.restore();
}

async function drawStatsSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textAlign = "center";
   ctx.textBaseline = "top";
   const paddingX = 80;
   const top = 160;

   const stats = slide.stats || [];
   const cols = 2;
   const rows = Math.ceil(stats.length / cols);
   const cardWidth = (width - paddingX * 2 - 40) / cols;
   const cardHeight = 160;

   stats.forEach((stat, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = paddingX + col * (cardWidth + 40);
      const y = top + row * (cardHeight + 30);

      // Card background
      drawRoundedRect(
         ctx,
         x,
         y,
         cardWidth,
         cardHeight,
         20,
         theme.panel,
         theme.panelStroke,
         1
      );

      // Value
      ctx.font = `bold 48px ${BASE_FONT_STACK}`;
      ctx.fillStyle = theme.accent;
      ctx.fillText(stat.value, x + cardWidth / 2, y + 30);

      // Label
      ctx.font = `600 18px ${BASE_FONT_STACK}`;
      ctx.fillStyle = theme.textPrimary;
      ctx.fillText(stat.label, x + cardWidth / 2, y + 90);

      // Description
      if (stat.description) {
         ctx.font = `400 14px ${BASE_FONT_STACK}`;
         ctx.fillStyle = theme.metaText;
         const descLines = wrapLines(ctx, stat.description, cardWidth - 32);
         let descY = y + 115;
         descLines.forEach((line) => {
            ctx.fillText(line, x + cardWidth / 2, descY);
            descY += 18;
         });
      }
   });

   ctx.restore();
}

async function drawComparisonSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textAlign = "left";
   ctx.textBaseline = "top";
   const paddingX = 80;
   const top = 140;
   const contentWidth = width - paddingX * 2;
   const columnWidth = (contentWidth - 60) / 2;

   const comparison = slide.comparison;
   if (!comparison) return;

   // Left column
   ctx.font = `700 32px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textPrimary;
   ctx.fillText(comparison.left.title, paddingX, top);

   ctx.font = `500 24px ${BASE_FONT_STACK}`;
   let cursorY = top + 50;
   comparison.left.items.forEach((item) => {
      ctx.save();
      ctx.fillStyle = "#ef4444"; // Red for "before"
      ctx.beginPath();
      ctx.arc(paddingX + 12, cursorY + 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = theme.textSecondary;
      ctx.fillText(item, paddingX + 30, cursorY);
      cursorY += 36;
   });

   // Right column
   const rightX = paddingX + columnWidth + 60;
   ctx.font = `700 32px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textPrimary;
   ctx.fillText(comparison.right.title, rightX, top);

   ctx.font = `500 24px ${BASE_FONT_STACK}`;
   cursorY = top + 50;
   comparison.right.items.forEach((item) => {
      ctx.save();
      ctx.fillStyle = theme.accent; // Theme color for "after"
      ctx.beginPath();
      ctx.arc(rightX + 12, cursorY + 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = theme.textSecondary;
      ctx.fillText(item, rightX + 30, cursorY);
      cursorY += 36;
   });

   ctx.restore();
}

async function drawImageRightSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textBaseline = "top";
   ctx.textAlign = "left";
   const paddingX = 72;
   const top = 120;

   const imageWidth = width * 0.36;
   const imageHeight = height * 0.56;
   const imageX = width - paddingX - imageWidth;
   const imageY = top + 20;

   const mediaItem = slide.media?.find((m) => m.kind === "image");
   const image = await loadSlideImage(mediaItem?.url);

   drawRoundedRect(
      ctx,
      imageX - 12,
      imageY - 12,
      imageWidth + 24,
      imageHeight + 24,
      34,
      theme.panel,
      theme.panelStroke,
      1
   );

   if (image) {
      ctx.save();
      const radius = 28;
      ctx.beginPath();
      ctx.moveTo(imageX + radius, imageY);
      ctx.lineTo(imageX + imageWidth - radius, imageY);
      ctx.quadraticCurveTo(
         imageX + imageWidth,
         imageY,
         imageX + imageWidth,
         imageY + radius
      );
      ctx.lineTo(imageX + imageWidth, imageY + imageHeight - radius);
      ctx.quadraticCurveTo(
         imageX + imageWidth,
         imageY + imageHeight,
         imageX + imageWidth - radius,
         imageY + imageHeight
      );
      ctx.lineTo(imageX + radius, imageY + imageHeight);
      ctx.quadraticCurveTo(
         imageX,
         imageY + imageHeight,
         imageX,
         imageY + imageHeight - radius
      );
      ctx.lineTo(imageX, imageY + radius);
      ctx.quadraticCurveTo(imageX, imageY, imageX + radius, imageY);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
      ctx.restore();
   } else {
      ctx.save();
      ctx.fillStyle = theme.accentSoft;
      ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
      ctx.fillStyle = theme.textSecondary;
      ctx.font = `500 18px ${BASE_FONT_STACK}`;
      ctx.textAlign = "center";
      ctx.fillText(
         mediaItem?.alt ?? "Image unavailable",
         imageX + imageWidth / 2,
         imageY + imageHeight / 2 - 12
      );
      ctx.restore();
   }

   const contentX = paddingX;
   const contentWidth = width - imageX - 72;

   ctx.fillStyle = theme.textPrimary;
   ctx.font = `700 52px ${BASE_FONT_STACK}`;
   const titleLines = wrapLines(ctx, slide.title, contentWidth);
   let cursorY = top;
   titleLines.forEach((line) => {
      ctx.fillText(line, contentX, cursorY);
      cursorY += 52 * 1.12;
   });

   cursorY += 20;
   ctx.font = `500 28px ${BASE_FONT_STACK}`;
   drawBulletedList(
      ctx,
      slide.bullets,
      contentX,
      cursorY,
      contentWidth,
      36,
      theme
   );

   ctx.restore();
}

async function drawThreeColumnSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.textAlign = "left";
   ctx.textBaseline = "top";
   const paddingX = 72;
   const top = 140;
   const contentWidth = width - paddingX * 2;
   const columnWidth = (contentWidth - 40) / 3;

   ctx.font = `700 44px ${BASE_FONT_STACK}`;
   ctx.fillStyle = theme.textPrimary;
   const titleLines = wrapLines(ctx, slide.title, contentWidth);
   let cursorY = top;
   titleLines.forEach((line) => {
      ctx.fillText(line, paddingX, cursorY);
      cursorY += 44 * 1.1;
   });

   cursorY += 30;

   const bullets = slide.bullets || [];
   const bulletsPerColumn = Math.ceil(bullets.length / 3);

   for (let col = 0; col < 3; col++) {
      const colX = paddingX + col * (columnWidth + 20);
      const columnBullets = bullets.slice(
         col * bulletsPerColumn,
         (col + 1) * bulletsPerColumn
      );

      ctx.font = `500 22px ${BASE_FONT_STACK}`;
      drawBulletedList(
         ctx,
         columnBullets,
         colX,
         cursorY,
         columnWidth,
         32,
         theme
      );
   }

   ctx.restore();
}

async function drawSlide(
   ctx: CanvasRenderingContext2D,
   slide: SlideWithStatus,
   meta: DeckMeta,
   theme: ThemeConfig,
   width: number,
   height: number
) {
   ctx.save();
   ctx.setTransform(1, 0, 0, 1, 0, 0);
   ctx.clearRect(0, 0, width, height);
   ctx.fillStyle = theme.background;
   ctx.fillRect(0, 0, width, height);
   const bgGradient = ctx.createLinearGradient(0, 0, width, height);
   bgGradient.addColorStop(0, theme.gradient[0]);
   bgGradient.addColorStop(1, theme.gradient[1]);
   ctx.fillStyle = bgGradient;
   ctx.fillRect(0, 0, width, height);

   drawAccentShapes(ctx, theme, width, height);
   drawMetaHeader(ctx, slide, meta, theme, width);

   switch (slide.layout) {
      case "title":
         await drawTitleSlide(ctx, slide, theme, meta, width, height);
         break;
      case "title-bullets":
         await drawTitleWithBullets(ctx, slide, theme, width, height);
         break;
      case "two-col":
         await drawTwoColumnSlide(ctx, slide, theme, width, height);
         break;
      case "image-left":
         await drawImageLeftSlide(ctx, slide, theme, width, height);
         break;
      case "image-right":
         await drawImageRightSlide(ctx, slide, theme, width, height);
         break;
      case "roadmap":
         await drawRoadmapSlide(ctx, slide, theme, width, height);
         break;
      case "quote":
         await drawQuoteSlide(ctx, slide, theme, width, height);
         break;
      case "stats":
         await drawStatsSlide(ctx, slide, theme, width, height);
         break;
      case "comparison":
         await drawComparisonSlide(ctx, slide, theme, width, height);
         break;
      case "three-col":
         await drawThreeColumnSlide(ctx, slide, theme, width, height);
         break;
      default:
         await drawTitleWithBullets(ctx, slide, theme, width, height);
         break;
   }

   ctx.restore();
}

async function renderSlideToCanvas(
   canvas: HTMLCanvasElement,
   slide: SlideWithStatus,
   meta: DeckMeta,
   options: { pixelRatio?: number } = {}
) {
   const ctx = canvas.getContext("2d");
   if (!ctx) return;

   const pixelRatio =
      options.pixelRatio ??
      (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
   canvas.width = SLIDE_WIDTH * pixelRatio;
   canvas.height = SLIDE_HEIGHT * pixelRatio;

   if (!canvas.style.width) {
      canvas.style.width = `${SLIDE_WIDTH}px`;
   }
   if (!canvas.style.height) {
      canvas.style.height = `${SLIDE_HEIGHT}px`;
   }

   if (ctx.resetTransform) {
      ctx.resetTransform();
   } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
   }

   if (pixelRatio !== 1) {
      ctx.scale(pixelRatio, pixelRatio);
   }

   const theme = themePalette[meta.theme] ?? themePalette.dark;
   await drawSlide(ctx, slide, meta, theme, SLIDE_WIDTH, SLIDE_HEIGHT);
}

async function renderSlideToImage(
   slide: SlideWithStatus,
   meta: DeckMeta,
   options: { format?: "png" | "jpeg"; pixelRatio?: number } = {}
) {
   const format = options.format ?? "png";
   const pixelRatio = options.pixelRatio ?? 1;
   const canvas = document.createElement("canvas");
   await renderSlideToCanvas(canvas, slide, meta, { pixelRatio });
   return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
         (blob) => resolve(blob),
         format === "png" ? "image/png" : "image/jpeg",
         format === "png" ? 0.92 : 0.85
      );
   });
}

const textEncoder = new TextEncoder();

function escapeXml(value: string) {
   return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
}

function sanitizeFileName(value: string) {
   const cleaned = value.replace(/[<>:"/\\|?*]+/g, "_").trim();
   return cleaned.length > 0 ? cleaned : "presentation";
}

const CRC32_TABLE = (() => {
   const table = new Uint32Array(256);
   for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
         c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
   }
   return table;
})();

function crc32(data: Uint8Array) {
   let crc = 0 ^ -1;
   for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
   }
   return (crc ^ -1) >>> 0;
}

function dateToDosTime(date: Date) {
   const hours = date.getHours();
   const minutes = date.getMinutes();
   const seconds = Math.floor(date.getSeconds() / 2);
   return (hours << 11) | (minutes << 5) | seconds;
}

function dateToDosDate(date: Date) {
   const year = Math.max(0, date.getFullYear() - 1980);
   const month = date.getMonth() + 1;
   const day = date.getDate();
   return (year << 9) | (month << 5) | day;
}

type ZipEntry = {
   path: string;
   data: Uint8Array;
   date?: Date;
};

function createZip(entries: ZipEntry[]) {
   const localParts: Uint8Array[] = [];
   const centralParts: Uint8Array[] = [];
   const fileMeta: {
      pathBytes: Uint8Array;
      crc: number;
      size: number;
      headerOffset: number;
      dosDate: number;
      dosTime: number;
   }[] = [];

   let offset = 0;

   entries.forEach((entry) => {
      const path = entry.path.replace(/\\/g, "/");
      const pathBytes = textEncoder.encode(path);
      const data = entry.data;
      const crc = crc32(data);
      const fileDate = entry.date ?? new Date();
      const dosDate = dateToDosDate(fileDate);
      const dosTime = dateToDosTime(fileDate);

      const localHeader = new Uint8Array(30 + pathBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, dosTime, true);
      localView.setUint16(12, dosDate, true);
      localView.setUint32(14, crc >>> 0, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, pathBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(pathBytes, 30);

      const headerOffset = offset;
      localParts.push(localHeader, data);
      offset += localHeader.length + data.length;

      fileMeta.push({
         pathBytes,
         crc,
         size: data.length,
         headerOffset,
         dosDate,
         dosTime,
      });
   });

   let centralSize = 0;
   fileMeta.forEach((meta, index) => {
      const central = new Uint8Array(46 + meta.pathBytes.length);
      const centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, meta.dosTime, true);
      centralView.setUint16(14, meta.dosDate, true);
      centralView.setUint32(16, meta.crc >>> 0, true);
      centralView.setUint32(20, meta.size, true);
      centralView.setUint32(24, meta.size, true);
      centralView.setUint16(28, meta.pathBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, index === 0 ? 0 : 0, true);
      centralView.setUint32(42, meta.headerOffset, true);
      central.set(meta.pathBytes, 46);
      centralParts.push(central);
      centralSize += central.length;
   });

   const endRecord = new Uint8Array(22);
   const endView = new DataView(endRecord.buffer);
   endView.setUint32(0, 0x06054b50, true);
   endView.setUint16(4, 0, true);
   endView.setUint16(6, 0, true);
   endView.setUint16(8, fileMeta.length, true);
   endView.setUint16(10, fileMeta.length, true);
   endView.setUint32(12, centralSize, true);
   endView.setUint32(16, offset, true);
   endView.setUint16(20, 0, true);

   const totalSize = offset + centralSize + endRecord.length;
   const output = new Uint8Array(totalSize);
   let pointer = 0;
   localParts.forEach((part) => {
      output.set(part, pointer);
      pointer += part.length;
   });
   centralParts.forEach((part) => {
      output.set(part, pointer);
      pointer += part.length;
   });
   output.set(endRecord, pointer);

   return output;
}

const SLIDE_MASTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Master Slide">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle>
      <a:lvl1pPr algn="ctr">
        <a:defRPr sz="4400" bold="1"/>
      </a:lvl1pPr>
    </p:titleStyle>
    <p:bodyStyle>
      <a:lvl1pPr marL="0" indent="0">
        <a:defRPr sz="3200"/>
      </a:lvl1pPr>
    </p:bodyStyle>
    <p:otherStyle>
      <a:defPPr>
        <a:defRPr/>
      </a:defPPr>
    </p:otherStyle>
  </p:txStyles>
  <p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="light1" bg2="light2" folHlink="folHlink" hlink="hlink" tx1="dark1" tx2="dark2"/>
</p:sldMaster>`;

const SLIDE_MASTER_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const SLIDE_LAYOUT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank Layout">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sldLayout>`;

const SLIDE_LAYOUT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const THEME_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1F497D"/></a:dk2>
      <a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:accent1><a:srgbClr val="4F81BD"/></a:accent1>
      <a:accent2><a:srgbClr val="C0504D"/></a:accent2>
      <a:accent3><a:srgbClr val="9BBB59"/></a:accent3>
      <a:accent4><a:srgbClr val="8064A2"/></a:accent4>
      <a:accent5><a:srgbClr val="4BACC6"/></a:accent5>
      <a:accent6><a:srgbClr val="F79646"/></a:accent6>
      <a:hlink><a:srgbClr val="0000FF"/></a:hlink>
      <a:folHlink><a:srgbClr val="800080"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"/></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"/></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0">
              <a:srgbClr val="000000" alpha="35000"/>
            </a:outerShdw>
          </a:effectLst>
        </a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"/></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

function buildContentTypes(slideCount: number) {
   const slideEntries = Array.from(
      { length: slideCount },
      (_, index) =>
         `  <Override PartName="/ppt/slides/slide${
            index + 1
         }.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
   ).join("\n");
   const imageEntries = Array.from(
      { length: slideCount },
      (_, index) =>
         `  <Override PartName="/ppt/media/image${
            index + 1
         }.png" ContentType="image/png"/>`
   ).join("\n");
   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Default Extension="xml" ContentType="application/xml"/>\n  <Default Extension="png" ContentType="image/png"/>\n  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>\n  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>\n  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>\n  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>\n  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>\n  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>\n${slideEntries}\n${imageEntries}\n</Types>`;
}

function buildAppXml(slides: SlideWithStatus[]) {
   const titles = slides
      .map((slide) => `      <vt:lpstr>${escapeXml(slide.title)}</vt:lpstr>`)
      .join("\n");
   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n  <Application>Lovaslide</Application>\n  <Slides>${slides.length}</Slides>\n  <Notes>0</Notes>\n  <PresentationFormat>16:9</PresentationFormat>\n  <DocSecurity>0</DocSecurity>\n  <ScaleCrop>false</ScaleCrop>\n  <HeadingPairs>\n    <vt:vector size="2" baseType="variant">\n      <vt:variant>\n        <vt:lpstr>Slides</vt:lpstr>\n      </vt:variant>\n      <vt:variant>\n        <vt:i4>${slides.length}</vt:i4>\n      </vt:variant>\n    </vt:vector>\n  </HeadingPairs>\n  <TitlesOfParts>\n    <vt:vector size="${slides.length}" baseType="lpstr">\n${titles}\n    </vt:vector>\n  </TitlesOfParts>\n  <Company>Lovaslide</Company>\n  <LinksUpToDate>false</LinksUpToDate>\n  <SharedDoc>false</SharedDoc>\n  <HyperlinksChanged>false</HyperlinksChanged>\n  <AppVersion>1.0</AppVersion>\n</Properties>`;
}

function buildCoreXml(meta: DeckMeta, created: string) {
   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n  <dc:title>${escapeXml(
      meta.title
   )}</dc:title>\n  <dc:subject>Generated from Lovaslide workspace</dc:subject>\n  <dc:creator>Lovaslide</dc:creator>\n  <cp:keywords>${escapeXml(
      meta.theme
   )}</cp:keywords>\n  <dc:description>Auto-generated presentation deck preview</dc:description>\n  <cp:lastModifiedBy>Lovaslide</cp:lastModifiedBy>\n  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>\n  <dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>\n</cp:coreProperties>`;
}

function buildPresentationXml(slideCount: number) {
   const sldIds = Array.from(
      { length: slideCount },
      (_, index) => `  <p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`
   ).join("\n");
   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">\n  <p:sldMasterIdLst>\n    <p:sldMasterId r:id="rId1"/>\n  </p:sldMasterIdLst>\n  <p:sldIdLst>\n${sldIds}\n  </p:sldIdLst>\n  <p:sldSz cx="9144000" cy="5143500" type="screen16x9"/>\n  <p:notesSz cx="6858000" cy="9144000"/>\n</p:presentation>`;
}

function buildPresentationRels(slideCount: number) {
   const slideRels = Array.from(
      { length: slideCount },
      (_, index) =>
         `  <Relationship Id="rId${
            index + 2
         }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${
            index + 1
         }.xml"/>`
   ).join("\n");
   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>\n${slideRels}\n</Relationships>`;
}

function buildSlideXml(slide: SlideWithStatus, index: number) {
   const title = escapeXml(slide.title || `Slide ${index + 1}`);
   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">\n  <p:cSld name="${title}">\n    <p:bg>\n      <p:bgPr>\n        <a:blipFill dpi="300">\n          <a:blip r:embed="rId2"/>\n          <a:stretch><a:fillRect/></a:stretch>\n        </a:blipFill>\n      </p:bgPr>\n    </p:bg>\n    <p:spTree>\n      <p:nvGrpSpPr>\n        <p:cNvPr id="1" name=""/>\n        <p:cNvGrpSpPr/>\n        <p:nvPr/>\n      </p:nvGrpSpPr>\n      <p:grpSpPr>\n        <a:xfrm>\n          <a:off x="0" y="0"/>\n          <a:ext cx="0" cy="0"/>\n          <a:chOff x="0" y="0"/>\n          <a:chExt cx="0" cy="0"/>\n        </a:xfrm>\n      </p:grpSpPr>\n    </p:spTree>\n  </p:cSld>\n  <p:clrMapOvr>\n    <a:masterClrMapping/>\n  </p:clrMapOvr>\n</p:sld>`;
}

function buildSlideRels(index: number) {
   return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${
      index + 1
   }.png"/>\n</Relationships>`;
}

async function buildPptx(slides: SlideWithStatus[], meta: DeckMeta) {
   const images: Uint8Array[] = [];
   for (const slide of slides) {
      const blob = await renderSlideToImage(slide, meta, {
         format: "png",
         pixelRatio: 1,
      });
      if (!blob) {
         throw new Error("Failed to render slide image for export");
      }
      const buffer = new Uint8Array(await blob.arrayBuffer());
      images.push(buffer);
   }

   const now = new Date();
   const iso = now.toISOString();

   const entries: ZipEntry[] = [
      {
         path: "[Content_Types].xml",
         data: textEncoder.encode(buildContentTypes(slides.length)),
      },
      {
         path: "_rels/.rels",
         data: textEncoder.encode(
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>\n  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>\n</Relationships>`
         ),
      },
      {
         path: "docProps/app.xml",
         data: textEncoder.encode(buildAppXml(slides)),
      },
      {
         path: "docProps/core.xml",
         data: textEncoder.encode(buildCoreXml(meta, iso)),
      },
      {
         path: "ppt/presentation.xml",
         data: textEncoder.encode(buildPresentationXml(slides.length)),
      },
      {
         path: "ppt/_rels/presentation.xml.rels",
         data: textEncoder.encode(buildPresentationRels(slides.length)),
      },
      {
         path: "ppt/slideMasters/slideMaster1.xml",
         data: textEncoder.encode(SLIDE_MASTER_XML),
      },
      {
         path: "ppt/slideMasters/_rels/slideMaster1.xml.rels",
         data: textEncoder.encode(SLIDE_MASTER_RELS_XML),
      },
      {
         path: "ppt/slideLayouts/slideLayout1.xml",
         data: textEncoder.encode(SLIDE_LAYOUT_XML),
      },
      {
         path: "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
         data: textEncoder.encode(SLIDE_LAYOUT_RELS_XML),
      },
      { path: "ppt/theme/theme1.xml", data: textEncoder.encode(THEME_XML) },
   ];

   slides.forEach((slide, index) => {
      entries.push({
         path: `ppt/slides/slide${index + 1}.xml`,
         data: textEncoder.encode(buildSlideXml(slide, index)),
      });
      entries.push({
         path: `ppt/slides/_rels/slide${index + 1}.xml.rels`,
         data: textEncoder.encode(buildSlideRels(index)),
      });
      entries.push({
         path: `ppt/media/image${index + 1}.png`,
         data: images[index],
      });
   });

   const zipBytes = createZip(entries);
   return new Blob([zipBytes], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
   });
}

function createPdfDocument(
   images: { data: Uint8Array; width: number; height: number }[]
) {
   if (images.length === 0) {
      throw new Error("No slides available for PDF export");
   }

   const catalogId = 1;
   const pagesId = 2;
   let nextId = 3;

   const objectBodies = new Map<number, Uint8Array>();
   const pageRefs: number[] = [];

   const pageWidthPoints = (SLIDE_WIDTH * 72) / 96;
   const pageHeightPoints = (SLIDE_HEIGHT * 72) / 96;

   images.forEach((image, index) => {
      const resourceName = `Im${index + 1}`;

      const imageId = nextId++;
      const imageHeader = textEncoder.encode(
         `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`
      );
      const imageFooter = textEncoder.encode(`\nendstream\n`);
      const imageBody = new Uint8Array(
         imageHeader.length + image.data.length + imageFooter.length
      );
      imageBody.set(imageHeader, 0);
      imageBody.set(image.data, imageHeader.length);
      imageBody.set(imageFooter, imageHeader.length + image.data.length);
      objectBodies.set(imageId, imageBody);

      const contentStream = `q\n${pageWidthPoints.toFixed(
         2
      )} 0 0 ${pageHeightPoints.toFixed(2)} 0 0 cm\n/${resourceName} Do\nQ\n`;
      const contentId = nextId++;
      const contentBody = textEncoder.encode(
         `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\n`
      );
      objectBodies.set(contentId, contentBody);

      const pageId = nextId++;
      const pageBody = textEncoder.encode(
         `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidthPoints.toFixed(
            2
         )} ${pageHeightPoints.toFixed(
            2
         )}] /Resources << /XObject << /${resourceName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\n`
      );
      objectBodies.set(pageId, pageBody);
      pageRefs.push(pageId);
   });

   const pagesBody = textEncoder.encode(
      `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs
         .map((id) => `${id} 0 R`)
         .join(" ")}] >>\n`
   );
   objectBodies.set(pagesId, pagesBody);

   const catalogBody = textEncoder.encode(
      `<< /Type /Catalog /Pages ${pagesId} 0 R >>\n`
   );
   objectBodies.set(catalogId, catalogBody);

   const sortedIds = Array.from(objectBodies.keys()).sort((a, b) => a - b);

   const header = "%PDF-1.4\n%Lovaslide\n";
   const headerBytes = textEncoder.encode(header);
   let offset = headerBytes.length;
   const xref: number[] = new Array(sortedIds.length + 1).fill(0);

   const objectChunks: Uint8Array[] = [];

   sortedIds.forEach((id, index) => {
      const body = objectBodies.get(id)!;
      const objHeader = textEncoder.encode(`${id} 0 obj\n`);
      const objFooter = textEncoder.encode(`endobj\n`);
      const chunk = new Uint8Array(
         objHeader.length + body.length + objFooter.length
      );
      chunk.set(objHeader, 0);
      chunk.set(body, objHeader.length);
      chunk.set(objFooter, objHeader.length + body.length);
      objectChunks.push(chunk);
      xref[id] = offset;
      offset += chunk.length;
   });

   const xrefHeader = textEncoder.encode(`xref\n0 ${sortedIds.length + 1}\n`);
   const xrefBodyParts = [textEncoder.encode(`0000000000 65535 f \n`)];
   sortedIds.forEach((id) => {
      const entry = `${xref[id].toString().padStart(10, "0")} 00000 n \n`;
      xrefBodyParts.push(textEncoder.encode(entry));
   });
   const xrefBody = xrefBodyParts.reduce((acc, part) => {
      const merged = new Uint8Array(acc.length + part.length);
      merged.set(acc, 0);
      merged.set(part, acc.length);
      return merged;
   }, new Uint8Array());

   const startXref = offset;
   const trailer = textEncoder.encode(
      `trailer\n<< /Size ${
         sortedIds.length + 1
      } /Root ${catalogId} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`
   );

   const totalLength =
      headerBytes.length +
      objectChunks.reduce((sum, chunk) => sum + chunk.length, 0) +
      xrefHeader.length +
      xrefBody.length +
      trailer.length;
   const result = new Uint8Array(totalLength);
   let pointer = 0;
   result.set(headerBytes, pointer);
   pointer += headerBytes.length;
   objectChunks.forEach((chunk) => {
      result.set(chunk, pointer);
      pointer += chunk.length;
   });
   result.set(xrefHeader, pointer);
   pointer += xrefHeader.length;
   result.set(xrefBody, pointer);
   pointer += xrefBody.length;
   result.set(trailer, pointer);

   return result;
}

async function buildPdf(slides: SlideWithStatus[], meta: DeckMeta) {
   const images = [] as { data: Uint8Array; width: number; height: number }[];
   const exportPixelRatio = 2;
   for (const slide of slides) {
      const blob = await renderSlideToImage(slide, meta, {
         format: "jpeg",
         pixelRatio: 1,
      });
      if (!blob) {
         throw new Error("Failed to render slide image for PDF export");
      }
      const data = new Uint8Array(await blob.arrayBuffer());
      images.push({
         data,
         width: SLIDE_WIDTH * exportPixelRatio,
         height: SLIDE_HEIGHT * exportPixelRatio,
      });
   }

   const pdfBytes = createPdfDocument(images);
   return new Blob([pdfBytes], { type: "application/pdf" });
}

function downloadBlob(blob: Blob, filename: string) {
   const url = URL.createObjectURL(blob);
   const link = document.createElement("a");
   link.href = url;
   link.download = filename;
   link.click();
   URL.revokeObjectURL(url);
}

const SlidePreview = ({
   slide,
   meta,
}: {
   slide: SlideWithStatus;
   meta: DeckMeta;
}) => {
   const canvasRef = useRef<HTMLCanvasElement | null>(null);
   const containerRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      let cancelled = false;

      const updateCanvasSize = () => {
         const rect = container.getBoundingClientRect();
         const pixelRatio =
            typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

         // Calculate the scale to fit the canvas in the container while maintaining aspect ratio
         const containerAspectRatio = rect.width / rect.height;
         const slideAspectRatio = SLIDE_WIDTH / SLIDE_HEIGHT;

         let scale: number;
         if (containerAspectRatio > slideAspectRatio) {
            // Container is wider, scale based on height
            scale = rect.height / SLIDE_HEIGHT;
         } else {
            // Container is taller, scale based on width
            scale = rect.width / SLIDE_WIDTH;
         }

         const scaledWidth = SLIDE_WIDTH * scale;
         const scaledHeight = SLIDE_HEIGHT * scale;

         // Set canvas display size
         canvas.style.width = `${scaledWidth}px`;
         canvas.style.height = `${scaledHeight}px`;

         // Set canvas internal resolution
         canvas.width = SLIDE_WIDTH * pixelRatio;
         canvas.height = SLIDE_HEIGHT * pixelRatio;
      };

      updateCanvasSize();

      (async () => {
         const pixelRatio =
            typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

         await renderSlideToCanvas(canvas, slide, meta, {
            pixelRatio: 1,
         });
         if (cancelled) return;
      })();

      // Listen for window resize
      const handleResize = () => {
         if (cancelled) return;
         updateCanvasSize();
      };

      window.addEventListener("resize", handleResize);

      return () => {
         cancelled = true;
         window.removeEventListener("resize", handleResize);
      };
   }, [slide, meta]);

   return (
      <div
         ref={containerRef}
         className="h-full w-full flex items-center justify-center bg-black/5"
      >
         <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain"
         />
      </div>
   );
};

export default function SlidesWorkspacePage() {
   const [activeSlideIndex, setActiveSlideIndex] = useState(0);
   const [noteText, setNoteText] = useState("");
   const [isProcessing, setIsProcessing] = useState(false);
   const [isDockOpen, setIsDockOpen] = useState(true);
   const [recentNotes, setRecentNotes] =
      useState<RecentNote[]>(defaultRecentNotes);
   const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
      null
   );
   const [currentTheme, setCurrentTheme] = useState<DeckMeta["theme"]>(
      demoDeck.meta.theme
   );
   const [slideData, setSlideData] = useState<any>(null);

   useEffect(() => {
      const storedData = sessionStorage.getItem("slideData");
      if (storedData) {
         try {
            const parsedData = JSON.parse(storedData);
            setSlideData(parsedData);
            sessionStorage.removeItem("slideData");
         } catch (error) {
            console.error("Failed to parse slide data:", error);
         }
      }
   }, []);

   const deckSlides = useMemo<SlideWithStatus[]>(() => {
      if (slideData && slideData.slides) {
         return slideData.slides.slides.map((slide: any, index: number) => ({
            ...slide,
            id: index + 1,
            status: "Ready",
         }));
      } else {
         return demoDeck.slides.map((slide, index) => ({
            ...slide,
            id: index + 1,
            status: slideStatuses[index] ?? "Draft",
         }));
      }
   }, [slideData]);

   const slidesCount = deckSlides.length;
   const activeSlide = deckSlides[activeSlideIndex];
   const isFirstSlide = activeSlideIndex === 0;
   const isLastSlide = activeSlideIndex === slidesCount - 1;

   const currentMeta = useMemo(() => {
      if (slideData && slideData.slides) {
         return {
            title: slideData.slides.meta.title,
            theme: currentTheme,
         };
      }
      return { ...demoDeck.meta, theme: currentTheme };
   }, [slideData, currentTheme]);

   const handleSubmitNote = () => {
      if (!noteText.trim()) return;

      setIsProcessing(true);
      setTimeout(() => {
         const newNote: RecentNote = {
            id: Date.now(),
            text: noteText,
            timestamp: "Just now",
            status: "pending",
         };
         setRecentNotes((prev) => [newNote, ...prev]);
         setNoteText("");
         setIsProcessing(false);
      }, 1200);
   };

   const handlePrevSlide = () => {
      if (!isFirstSlide) {
         setActiveSlideIndex((prev) => prev - 1);
      }
   };

   const handleNextSlide = () => {
      if (!isLastSlide) {
         setActiveSlideIndex((prev) => prev + 1);
      }
   };

   const handleSelectSlide = (index: number) => {
      setActiveSlideIndex(index);
   };

   useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
         if (e.defaultPrevented) return;
         const target = e.target as HTMLElement | null;
         if (target) {
            const tag = target.tagName.toLowerCase();
            if (
               tag === "input" ||
               tag === "textarea" ||
               tag === "select" ||
               target.isContentEditable
            ) {
               return;
            }
         }

         if (e.key === "ArrowLeft") {
            e.preventDefault();
            handlePrevSlide();
         } else if (e.key === "ArrowRight") {
            e.preventDefault();
            handleNextSlide();
         } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIsDockOpen(true);
         } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setIsDockOpen(false);
         }
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
   }, [handlePrevSlide, handleNextSlide]);

   const handleExport = async (format: ExportFormat) => {
      if (exportingFormat) return;
      setExportingFormat(format);
      try {
         if (format === "pptx" || format === "google") {
            const blob = await buildPptx(deckSlides, currentMeta);
            const suffix =
               format === "google" ? " - Google Slides.pptx" : ".pptx";
            downloadBlob(
               blob,
               `${sanitizeFileName(currentMeta.title)}${suffix}`
            );
         } else if (format === "pdf") {
            const pdfBlob = await buildPdf(deckSlides, currentMeta);
            downloadBlob(pdfBlob, `${sanitizeFileName(currentMeta.title)}.pdf`);
         }
      } catch (error) {
         console.error("Export failed", error);
         window.alert(
            "We couldn't generate that export just yet. Please try again."
         );
      } finally {
         setExportingFormat(null);
      }
   };

   const exportButtonLabel = exportingFormat ? "Generating..." : "Export";

   return (
      <div className="flex min-h-screen flex-col bg-background">
         <header className="flex items-center justify-between border-b border-border/60 bg-background/95 backdrop-blur w-full">
            <div className="flex items-center justify-between gap-4 px-6 py-4 w-full">
               <div className="flex items-center gap-4">
                  <LayoutDashboard className="h-8 w-8" />
                  <div>
                     <h1 className="text-2xl font-semibold text-foreground">
                        Lovaslide Presentation Workspace
                     </h1>
                     <p className="text-sm text-muted-foreground">
                        {currentMeta.title} · {slidesCount} slides · Theme:{" "}
                        {currentTheme}
                     </p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                           Theme: {currentTheme}
                           <ChevronDown className="h-4 w-4" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                           onSelect={() => setCurrentTheme("light")}
                        >
                           Light
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           onSelect={() => setCurrentTheme("dark")}
                        >
                           Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           onSelect={() => setCurrentTheme("blue")}
                        >
                           Blue
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           onSelect={() => setCurrentTheme("green")}
                        >
                           Green
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           onSelect={() => setCurrentTheme("purple")}
                        >
                           Purple
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           onSelect={() => setCurrentTheme("corporate")}
                        >
                           Corporate
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" className="gap-2">
                     <Play className="h-4 w-4" />
                     Present
                  </Button>
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           size="sm"
                           className="gap-2"
                           disabled={!!exportingFormat}
                        >
                           {exportButtonLabel}
                           {exportingFormat ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                           ) : (
                              <ChevronDown className="h-4 w-4" />
                           )}
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                           className="gap-2"
                           disabled={!!exportingFormat}
                           onSelect={() => handleExport("pptx")}
                        >
                           <FileText className="h-4 w-4" />
                           <span>{formatLabels.pptx}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           className="gap-2"
                           disabled={!!exportingFormat}
                           onSelect={() => handleExport("google")}
                        >
                           <Presentation className="h-4 w-4" />
                           <span>{formatLabels.google}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                           className="gap-2"
                           disabled={!!exportingFormat}
                           onSelect={() => handleExport("pdf")}
                        >
                           <Download className="h-4 w-4" />
                           <span>{formatLabels.pdf}</span>
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            </div>
         </header>

         <main className="flex-1">
            <div className="container mx-auto flex max-w-screen flex-col gap-8 px-6 py-10">
               <div className="flex flex-col gap-6 lg:flex-row">
                  <Card className="flex-1 overflow-hidden border-border/60 bg-gradient-to-br from-primary/15 via-background to-background">
                     <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                           <SlideStatusBadge
                              label={`Slide ${String(activeSlide.id).padStart(
                                 2,
                                 "0"
                              )}`}
                              tone={getToneForStatus(activeSlide.status)}
                           />
                           <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                              {activeSlide.layout.replace(/-/g, " ")}
                           </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                           <div className="text-xs text-muted-foreground/80">
                              Slide {activeSlideIndex + 1} of {slidesCount}
                           </div>
                        </div>
                     </CardHeader>
                     <CardContent>
                        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black/80">
                           <div className="relative h-full w-full">
                              <SlidePreview
                                 slide={activeSlide}
                                 meta={currentMeta}
                              />
                           </div>
                           <div className="pointer-events-none absolute bottom-4 left-6 right-6">
                              <div className="pointer-events-auto rounded-2xl border border-white/15 bg-black/70 backdrop-blur overflow-hidden transition-all duration-300 ease-in-out">
                                 <div className="flex justify-center py-1">
                                    <Button
                                       variant="ghost"
                                       size="icon-sm"
                                       className="h-6 w-12 rounded-full border border-white/20 text-white hover:border-primary/40 hover:text-primary"
                                       aria-label={
                                          isDockOpen ? "Hide dock" : "Show dock"
                                       }
                                       onClick={() =>
                                          setIsDockOpen(!isDockOpen)
                                       }
                                    >
                                       <ChevronUp
                                          className={cn(
                                             "h-3 w-3 transition-transform duration-200",
                                             isDockOpen && "rotate-180"
                                          )}
                                       />
                                    </Button>
                                 </div>
                                 <div
                                    className={cn(
                                       "transition-all duration-300 ease-in-out overflow-hidden",
                                       isDockOpen
                                          ? "max-h-36 opacity-100"
                                          : "max-h-0 opacity-0"
                                    )}
                                 >
                                    <div className="px-3 pb-2">
                                       <div className="flex items-center gap-2">
                                          <Button
                                             variant="ghost"
                                             size="icon-sm"
                                             className="h-8 w-8 rounded-full border border-white/20 text-white hover:border-primary/40 hover:text-primary disabled:opacity-40"
                                             aria-label="Previous slide"
                                             onClick={handlePrevSlide}
                                             disabled={isFirstSlide}
                                          >
                                             <ChevronLeft className="h-4 w-4" />
                                          </Button>
                                          <div
                                             ref={(el) => {
                                                if (el) {
                                                   // Auto-scroll to active slide
                                                   const activeButton = el
                                                      .children[
                                                      activeSlideIndex
                                                   ] as HTMLElement;
                                                   if (activeButton) {
                                                      // For first and last slides, use 'nearest' to avoid cutoff
                                                      // For middle slides, use 'center' for better visibility
                                                      const scrollBehavior =
                                                         activeSlideIndex ===
                                                            0 ||
                                                         activeSlideIndex ===
                                                            slidesCount - 1
                                                            ? "nearest"
                                                            : "center";

                                                      activeButton.scrollIntoView(
                                                         {
                                                            behavior: "smooth",
                                                            block: "nearest",
                                                            inline:
                                                               scrollBehavior,
                                                         }
                                                      );
                                                   }
                                                }
                                             }}
                                             className="flex gap-2 overflow-x-auto pb-1 px-4 flex-1 justify-start"
                                          >
                                             {deckSlides.map((slide, index) => (
                                                <button
                                                   key={slide.id}
                                                   onClick={() =>
                                                      handleSelectSlide(index)
                                                   }
                                                   className={cn(
                                                      "min-w-[140px] rounded-xl border px-3 py-2 text-left transition-colors",
                                                      index === activeSlideIndex
                                                         ? "border-primary/60 bg-primary/20 text-primary-foreground"
                                                         : "border-white/10 bg-black/40 text-white/70 hover:border-white/30"
                                                   )}
                                                >
                                                   <p className="text-xs uppercase tracking-wide text-white/60">
                                                      {slide.layout.replace(
                                                         /-/g,
                                                         " "
                                                      )}
                                                   </p>
                                                   <p className="text-sm font-semibold text-white">
                                                      {slide.title}
                                                   </p>
                                                </button>
                                             ))}
                                          </div>
                                          <Button
                                             variant="ghost"
                                             size="icon-sm"
                                             className="h-8 w-8 rounded-full border border-white/20 text-white hover:border-primary/40 hover:text-primary disabled:opacity-40"
                                             aria-label="Next slide"
                                             onClick={handleNextSlide}
                                             disabled={isLastSlide}
                                          >
                                             <ChevronRight className="h-4 w-4" />
                                          </Button>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </CardContent>
                  </Card>

                  <Card className="w-full border-border/60 lg:max-w-sm">
                     <CardHeader className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-foreground">
                           Add notes & actions
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                           Share context or cue an agent to update this slide.
                        </p>
                     </CardHeader>
                     <div className="h-px bg-border/60" />
                     <CardContent className="space-y-6">
                        {recentNotes.length > 0 && (
                           <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                 <History className="h-4 w-4 text-muted-foreground" />
                                 <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Recent notes
                                 </Label>
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                 {recentNotes.slice(0, 2).map((note) => (
                                    <div
                                       key={note.id}
                                       className={cn(
                                          "rounded-lg border p-3 text-sm transition-colors",
                                          note.status === "completed"
                                             ? "border-emerald-200/20 bg-emerald-50/10"
                                             : "border-amber-200/20 bg-amber-50/10"
                                       )}
                                    >
                                       <div className="flex items-start gap-2">
                                          {note.status === "completed" ? (
                                             <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                          ) : (
                                             <Bot className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                          )}
                                          <div className="flex-1 min-w-0">
                                             <p className="text-foreground/90 leading-relaxed">
                                                {note.text}
                                             </p>
                                             <p className="text-xs text-muted-foreground mt-1">
                                                {note.timestamp}
                                             </p>
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        <div className="space-y-3">
                           <Label
                              htmlFor="slide-note"
                              className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3 block"
                           >
                              Add a note
                           </Label>
                           <Textarea
                              id="slide-note"
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Describe a change or ask an agent to edit this slide..."
                              className="min-h-[100px]"
                           />
                           <div className="flex items-center gap-2">
                              <Button
                                 size="sm"
                                 className="gap-2 flex-1"
                                 onClick={handleSubmitNote}
                                 disabled={!noteText.trim() || isProcessing}
                              >
                                 {isProcessing ? (
                                    <>
                                       <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                       Processing...
                                    </>
                                 ) : (
                                    <>
                                       <Send className="h-4 w-4" />
                                       Send to agent
                                    </>
                                 )}
                              </Button>
                              <Button
                                 variant="outline"
                                 size="icon"
                                 className="h-8 w-8"
                              >
                                 <Sparkles className="h-4 w-4" />
                              </Button>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               </div>
            </div>
         </main>

         <Button
            size="lg"
            className="fixed bottom-6 right-6 z-40 gap-3 bg-primary text-primary-foreground shadow-xl hover:bg-primary/90"
         >
            <MessageSquare className="h-5 w-5" />
            Talk to Slides
         </Button>
      </div>
   );
}

const statusToneMap: Record<string, "neutral" | "attention" | "success"> = {
   ready: "success",
   draft: "neutral",
   "needs polish": "attention",
   "in review": "attention",
};

const getToneForStatus = (status: string) => {
   const key = status.toLowerCase();
   return statusToneMap[key] ?? "neutral";
};

type SlideStatusBadgeProps = {
   label: string;
   tone?: "neutral" | "attention" | "success";
};

const SlideStatusBadge = ({
   label,
   tone = "neutral",
}: SlideStatusBadgeProps) => {
   const styles = {
      neutral: "border-white/15 bg-white/5 text-white/70",
      attention: "border-amber-300/40 bg-amber-400/15 text-amber-100",
      success: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
   } as const;

   return (
      <span
         className={cn(
            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide",
            styles[tone]
         )}
      >
         <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
         {label}
      </span>
   );
};
