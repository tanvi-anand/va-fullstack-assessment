// Right bottom: what needs attention, most serious first, plus the status key.
import type { ReactNode } from 'react';
import type { attentionItem } from '../lib/sensor-display';
import { getTagText } from '../lib/sensor-display';
import { Card } from './ui/card';
import { AlarmBadge } from './status-badges';

export function AttentionPanel({ items }: { items: attentionItem[] }) {
  return (
    <Card className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
        <span className="text-[11px] text-muted-foreground">most serious first</span>
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <div className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
            Nothing needs attention. All sensors are in range and reporting.
          </div>
        )}
        {items.map((item) => (
          <AttentionRow key={item.key} item={item} />
        ))}
      </div>

      <StatusKey />
    </Card>
  );
}

function AttentionRow({ item }: { item: attentionItem }) {
  let ageText = '';
  if (item.age !== null && item.kind !== 'no_data') {
    ageText = `${item.age.toFixed(1)}s`;
  }

  return (
    <div className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2">
      <div className="flex items-center gap-2">
        <ItemMarker item={item} />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{item.title}</p>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{ageText}</span>
      </div>
      <p className="text-xs text-muted-foreground">{item.detail}</p>
    </div>
  );
}

function ItemMarker({ item }: { item: attentionItem }) {
  if (item.kind === 'alarm') {
    return <AlarmBadge faded={false} />;
  }
  if (item.kind === 'last_known_alarm') {
    return <AlarmBadge faded={true} />;
  }
  if (item.kind === 'out_of_range') {
    return (
      <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded bg-warning/15 px-1.5 font-mono text-[10px] font-semibold text-warning">
        {getTagText(item.state, item.age)}
      </span>
    );
  }
  return (
    <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded border border-dashed border-stale px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">
      NO DATA
    </span>
  );
}

function StatusKey() {
  return (
    <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
      <h3 className="text-[11px] font-medium tracking-wider text-muted-foreground">HOW TO READ STATUS</h3>
      <KeyRow marker={<span className="inline-flex h-[20px] items-center rounded bg-success/15 px-1.5 font-mono text-[10px] font-semibold text-success">OK</span>} text="Reading inside the valid range" />
      <KeyRow marker={<span className="inline-flex h-[20px] items-center rounded bg-warning/15 px-1.5 font-mono text-[10px] font-semibold text-warning">ABOVE MAX</span>} text="This reading is out of range" />
      <KeyRow marker={<AlarmBadge faded={false} />} text="4+ out of range within 5s" />
      <KeyRow marker={<span className="inline-flex h-[20px] items-center rounded border border-dashed border-stale px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">NO DATA 5s</span>} text="No new reading for 3s or more" />
    </div>
  );
}

function KeyRow({ marker, text }: { marker: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-[74px] shrink-0">{marker}</div>
      <span className="text-[11px] text-muted-foreground">{text}</span>
    </div>
  );
}
