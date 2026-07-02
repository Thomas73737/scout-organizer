import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BADGE_META, CATEGORY_META } from "./badge-constants";
import type { BadgeCategory } from "./badge-constants";

interface BadgeCardProps {
  name: string;
  size?: "sm" | "md" | "lg";
  showCategory?: boolean;
  className?: string;
}

export function BadgeCard({ name, size = "md", showCategory = true, className = "" }: BadgeCardProps) {
  const meta = BADGE_META[name];
  if (!meta) {
    return (
      <Card className={`p-3 border-dashed border-border ${className}`}>
        <p className="text-sm text-muted-foreground">{name}</p>
      </Card>
    );
  }

  const Icon = meta.icon;
  const catMeta = CATEGORY_META[meta.category];

  const sizeClasses = {
    sm: "p-2 min-w-[100px]",
    md: "p-3 min-w-[130px]",
    lg: "p-5 min-w-[180px]",
  };

  const iconSizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" };

  return (
    <Card
      className={`${sizeClasses[size]} ${meta.bgColor} ${meta.borderColor} border-2
        transition-all duration-200 hover:scale-105 hover:shadow-lg hover:-translate-y-1
        cursor-default group ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`${meta.color} transition-transform duration-200 group-hover:scale-110`}>
          <Icon className={iconSizes[size]} />
        </div>
        <div className="min-w-0">
          <p className={`${textSizes[size]} font-semibold text-foreground truncate`}>{name}</p>
          {showCategory && (
            <p className={`text-[10px] ${catMeta.color} opacity-80`}>{catMeta.label}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

interface BadgeChipProps {
  name: string;
  onRemove?: () => void;
  size?: "sm" | "md";
}

export function BadgeChip({ name, onRemove, size = "sm" }: BadgeChipProps) {
  const meta = BADGE_META[name];
  if (!meta) return null;

  const Icon = meta.icon;
  const iconSizes = { sm: "h-3 w-3", md: "h-4 w-4" };
  const textSizes = { sm: "text-[11px]", md: "text-xs" };

  return (
    <Badge
      variant="outline"
      className={`${meta.bgColor} ${meta.borderColor} border gap-1 px-2 py-0.5
        transition-all duration-150 hover:scale-105`}
    >
      <Icon className={`${iconSizes[size]} ${meta.color}`} />
      <span className={`${textSizes[size]} font-medium`}>{name}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
        >
          ×
        </button>
      )}
    </Badge>
  );
}

interface BadgeSectionProps {
  title: string;
  badges: string[];
  category: BadgeCategory;
  emptyMessage?: string;
  emptyIcon?: any;
}

export function BadgeSection({ title, badges, category, emptyMessage, emptyIcon: EmptyIcon }: BadgeSectionProps) {
  const catMeta = CATEGORY_META[category];
  const sectionColors: Record<BadgeCategory, string> = {
    main: "border-l-amber-400",
    proficiency: "border-l-blue-400",
    hobby: "border-l-green-400",
  };

  if (badges.length === 0) {
    return (
      <div className={`border-l-4 ${sectionColors[category]} pl-4`}>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className={`text-[10px] ${catMeta.color} font-medium`}>{catMeta.labelAr}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          {EmptyIcon && <EmptyIcon className="h-4 w-4" />}
          <p className="text-sm italic">{emptyMessage || `No ${catMeta.label.toLowerCase()}`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-l-4 ${sectionColors[category]} pl-4`}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className={`text-[10px] ${catMeta.color} font-medium`}>{catMeta.labelAr}</span>
        <span className="text-xs text-muted-foreground ml-auto">({badges.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <BadgeCard key={badge} name={badge} size={category === "main" ? "lg" : "sm"} showCategory={false} />
        ))}
      </div>
    </div>
  );
}

export function NoBadgePlaceholder({ category }: { category: BadgeCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <Card className="p-4 border-dashed border-border bg-muted/30">
      <p className="text-sm text-muted-foreground text-center italic">
        No {meta.label.toLowerCase()} yet
      </p>
    </Card>
  );
}
