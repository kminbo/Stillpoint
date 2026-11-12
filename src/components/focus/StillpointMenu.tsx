import { useEffect, useState } from "react";
import { ChevronDown, UserRound, Settings2, ShieldCheck, Trash2, Volume2, Bell, Eye, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadProfileName, saveProfileName, PROFILE_OPTIONS } from "@/lib/profile";
import { SESSION_LENGTHS, type SessionMinutes } from "@/lib/session-settings";
import type { AlertPrefs } from "@/lib/alerts";

const NUDGES = [
  { key: "blur", label: "Blur screen", icon: Eye },
  { key: "sound", label: "Sound", icon: Volume2 },
  { key: "notification", label: "Notification", icon: Bell },
] as const;

interface Props {
  onPrivacy: () => void;
  onDeleteHistory: () => void;
  onDeleteShared: () => Promise<void>;
  deletionBusy: boolean;
  deletionPending: boolean;
  deletionMessage: string | null;
  alerts: AlertPrefs;
  onAlertsChange: (alerts: AlertPrefs) => void;
  notifHint: string | null;
  sessionMinutes: SessionMinutes;
  onSessionMinutesChange: (minutes: SessionMinutes) => void;
  sessionActive: boolean;
}

export function StillpointMenu(props: Props) {
  const [panel, setPanel] = useState<"profile" | "settings" | "delete" | null>(null);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [confirmHistory, setConfirmHistory] = useState(false);
  useEffect(() => { const saved = loadProfileName(); setName(saved); setDraft(saved); }, []);

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label="Open Stillpoint menu" className="h-auto gap-3 rounded-xl p-1.5 text-ink">
          <span className="grid size-11 place-items-center rounded-2xl bg-card/70 ring-1 ring-glass-border backdrop-blur-xl">
            <span className="size-4 rounded-full bg-primary ring-4 ring-primary/25" />
          </span>
          <span className="font-display text-[17px] font-semibold">Stillpoint</span>
          <ChevronDown className="text-ink-soft" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={10} className="w-60 p-2">
        <DropdownMenuLabel className="text-xs text-ink-soft">{name || "Your Stillpoint"}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => { setDraft(name); setProfileMessage(null); setPanel("profile"); }}><UserRound />Profile</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setPanel("settings")}><Settings2 />Session settings</DropdownMenuItem>
        <DropdownMenuItem onSelect={props.onPrivacy}><ShieldCheck />Privacy & data</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => { setHistoryMessage(null); setConfirmHistory(false); setPanel("delete"); }}><Trash2 />Delete data</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto">
        {panel === "profile" && <>
          <DialogTitle>Your profile</DialogTitle>
          <DialogDescription>Choose a non-personal profile label saved only in this browser. No account is needed for focus sessions.</DialogDescription>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            try { const saved = saveProfileName(draft); setName(saved); setDraft(saved); setProfileMessage("Profile saved on this browser."); }
            catch { setProfileMessage("Your profile could not be saved. Please allow browser storage and try again."); }
          }}>
            <Select value={draft || "none"} onValueChange={(value) => setDraft(value === "none" ? "" : value)}>
              <SelectTrigger aria-label="Profile label"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">No profile label</SelectItem>{PROFILE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="submit">Save profile</Button>
            {profileMessage && <p role="status" className="text-sm text-ink-soft">{profileMessage}</p>}
          </form>
        </>}
        {panel === "settings" && <>
          <DialogTitle>Session settings</DialogTitle>
          <DialogDescription>Choose your nudges. Head direction and tilt tracking stay on.</DialogDescription>
          <div className="divide-y divide-border">
            {NUDGES.map(({ key, label, icon: Icon }) => <div key={key} className="flex items-center justify-between py-3">
              <span className="flex items-center gap-3 text-sm"><Icon className="size-4 text-ink-soft" />{label}</span>
              <Switch aria-label={label} checked={props.alerts[key]} onCheckedChange={(checked) => props.onAlertsChange({ ...props.alerts, [key]: checked })} />
            </div>)}
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-3 text-sm"><Timer className="size-4 text-ink-soft" />End after</span>
              <Select disabled={props.sessionActive} value={props.sessionMinutes === null ? "none" : String(props.sessionMinutes)} onValueChange={(value) => props.onSessionMinutesChange(value === "none" ? null : Number(value) as SessionMinutes)}>
                <SelectTrigger aria-label="Session duration" className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">No timer</SelectItem>{SESSION_LENGTHS.map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} minutes</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {props.sessionActive && <p className="text-xs text-ink-soft">The timer can be changed before your next session.</p>}
          {props.notifHint && <p role="status" className="text-xs text-warning">{props.notifHint}</p>}
        </>}
        {panel === "delete" && <>
          <DialogTitle>Delete your data</DialogTitle>
          <DialogDescription>Choose which data to delete. These actions cannot be undone.</DialogDescription>
          <section className="space-y-3 border-b border-border pb-5">
            <h2 className="text-sm font-semibold">Shared statistics & feedback</h2>
            <p className="text-sm text-ink-soft">Stops sharing immediately and deletes data linked to this browser. Your local focus history and profile stay here. Older unlinked statistics and combined insights cannot be individually deleted.</p>
            <Button variant="destructive" disabled={props.deletionBusy} onClick={() => void props.onDeleteShared()}><Trash2 />{props.deletionBusy ? "Deleting…" : props.deletionPending ? "Retry shared data deletion" : "Stop sharing & delete shared data"}</Button>
            {props.deletionMessage && <p role="status" className="text-sm text-ink-soft">{props.deletionMessage}</p>}
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">History on this browser</h2>
            <p className="text-sm text-ink-soft">Deletes saved focus sessions and distraction trends on this browser only.</p>
            {confirmHistory ? <div className="flex flex-wrap gap-2"><Button variant="destructive" onClick={() => {
              try { props.onDeleteHistory(); setHistoryMessage("Your local focus history has been deleted."); setConfirmHistory(false); }
              catch { setHistoryMessage("History could not be deleted. Please try again."); }
            }}>Confirm history deletion</Button><Button variant="outline" onClick={() => setConfirmHistory(false)}>Cancel</Button></div> : <Button variant="outline" onClick={() => setConfirmHistory(true)}><Trash2 />Delete local history</Button>}
            {historyMessage && <p role="status" className="text-sm text-ink-soft">{historyMessage}</p>}
          </section>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}