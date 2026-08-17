# CLAD Prompt Log — Todaydesk

**Hackathon:** CLAD Summer Hackathon — Organize  
**Project:** Todaywall (was Todaydesk — rebuilt as a wall whiteboard)  
**Builder:** Cursor + CLAD (Lens Studio MCP)  
**Date:** 2026-08-16

This log follows the real prompts and AI-assisted workflow used to create the Lens.

---

## Ideation

**Prompt:** Review Lenslist CLAD Summer Hackathon submission requirements.  
**CLAD:** Explained required pieces (repo, demo video, prompt log, description), judging, SPECS-without-hardware.

**Prompt:** Clarify what a CLAD prompt log is, and whether CLAD can write it.  
**CLAD:** Paper trail of prompts + what the AI did. Offered to maintain this file from the real chat.

**Prompt:** Trello-like daily tasks as 3D columns on a real desk; move cards by hand when finished.  
**CLAD:** Affirmed, proposed a glanceable 3-tray desk Kanban instead of a tiny-text Trello clone.

**Prompt:** Standalone (no Trello). Confirm Specs built-in keyboard. Check Lens Studio MCP / CLAD / sign-in.  
**CLAD:** Confirmed `TextInputSystem` keyboard (does not appear in SPECS 27 Preview simulation). MCP connected; user signed in. Locked keyboard add + local persist.

## Prompt design

**Prompt:** Match the Specs tutorial basketball prompt format (Goal, Core interaction, Feel & polish, Scoring, Working mode). Cooler name than Desk Kanban, like Today Planner.  
**CLAD:** Named the Lens **Todaydesk**. Wrote `prompts/01-todaydesk.txt` in that structure.

**Prompt:** Love the name Todaydesk. Prompt looks solid. Start building again.  
**CLAD:** One-shot build from `prompts/01-todaydesk.txt`. No remaining product questions.

---

## Build

**Prompt:** Build Todaydesk now as a one-shot end-to-end SPECS Lens from `prompts/01-todaydesk.txt`. No product questions. Append build notes as you go.

**CLAD:** Router-spawned builder. Environment: Lens Studio 5.23.1, Spectacles target, Camera Perspective + DeviceTracking World, SIK + UIKit installed, SIK prefab at root, Preview stereo Interactive (Evening Room). Node v24.19.0; Blender 5.0.1.

### Phase 0 plan
- **Tier:** interactive
- **Name:** Todaydesk
- **Theme:** realistic, clean; palette warm wood-brown / cream / muted slate-blue / sage / terracotta; mood calm, focused, quiet utility
- **Music:** none (utility tool)
- **Assets:** TodoTray, DoingTray, DoneTray, TaskCard meshes (SPECS text-to-3D); CardPickup / CardDrop / CardDone SFX; add + check icons; TodaydeskAddUI (Add button + TextInputField)
- **Layout (board-local, table y=0):** trays at x = −20.5 / 0 / +20.5, ~18×3.5×22 cm; cards ~12×1.2×8 cm stacked in trays; Add panel at near edge (0, 10, 16)
- **Scripts:** Main, State (PersistentStorage), BoardController (World Query + grab/drop), AudioController, SceneRefs, AssetManifest, AddUI
- **Sample cards:** Write recap, Book dentist, Review PRs, Inbox 10, Water plants

*Session notes continue below as CLAD generates assets, scripts, and the scene.*

### Phase 2 assets (generated)
- **Icons:** `Assets/Icons/add.png` (used). `check.png` imported, unused (orphan).
- **SFX:** `CardPickup.wav`, `CardDrop.wav`, `CardDone.wav` in `Assets/GeneratedSFX/`. No background music (utility tool).
- **Meshes (SPECS text-to-3D, all normalized / grounded / −Z front):** TodoTray, DoingTray, DoneTray, TaskCard (standing tent). DoingTray visual is yawed 90° at runtime so it matches the other trays’ left–right width.
- **UI:** `Assets/Scripts/TodaydeskAddUI.ts` — Frame + TextInputField + Add button (add icon). Opens Specs `TextInputSystem` keyboard when the field is empty. Keyboard does not appear in SPECS 27 Preview (expected).

### Phase 2f scripts
Prefix `Todaydesk*`, flat under `Assets/Scripts/`:
- `TodaydeskMain.ts` — lifecycle, wires Add → board, debug colliders
- `TodaydeskBoardController.ts` — tray meshes, World Query desk hunt, SIK grab/drop, local persist via State
- `TodaydeskState.ts` — `persistentStorageSystem` key `todaydesk.v1.cards`; seeds 5 samples
- `TodaydeskAudioController.ts` — LowLatency pickup / drop / done
- `TodaydeskAssetManifest.ts`, `TodaydeskSceneRefs.ts`, `TodaydeskAddUI.ts`

### Phase 3 bootstrap
- VirtualScene Phase A create (16 ops, 0 errors) then recompile then Phase B wire (9 ops, 0 errors).
- Hierarchy: `Todaydesk` → `TodaydeskBoard` (Todo/Doing/Done slots, CardsRoot, Add panel, Audio).
- No ImageMaterial (no `Component.Image`). No SyncKit.

### Runtime notes after bootstrap
- First placement used camera `forward()` (+Z) and hid the board behind the preview view. Fixed to camera local −Z look (`look = 0,0,−1`); fallback now at `(0, −42, −80)`.
- Evening Room Interactive: World Query returned no in-front desk in 2.5s → in-front fallback (as specced). On-device World Query should still pin to a real table.
- FlexLayout `addItems` before init threw; set `autoDiscoverItemsOnStart = false`.
- Looking slightly down in Preview shows three trays + sample tent cards + Add panel in front of the user.

**Prompt:** (same one-shot request — continue without pausing.)
**CLAD:** Finished scripts, two-phase VirtualScene bootstrap, placement/look-direction fixes, project save. Machine-readable summary emitted for the router verify pass.

## Pivot — Todaywall

**Prompt:** Didn't like the desk buckets. Use wall/surface detection instead — a see-through whiteboard on the wall so people without a real whiteboard can still see what they have to do. Rename something whiteboard-ish. Ask questions before rebuilding.

**CLAD:** Locked:
- Name: **Todaywall**
- Layout: three see-through columns To do / Doing / Done
- Place: look at a wall, ghost preview, pinch to pin
- Size: poster-sized
Wrote `prompts/02-todaywall.txt`. User said rebuild and replace the desk trays.

---

## Todaywall build

**Prompt:** Rebuild as Todaywall from `prompts/02-todaywall.txt`. Replace Todaydesk. No wooden buckets. No music. Persist under a new storage key. One-shot.

**CLAD (builder):** Lens Studio 5.23.1, Spectacles target, Camera Perspective + DeviceTracking World, SIK + UIKit, Preview stereo Interactive (Evening Room).

### Phase 0 plan
- **Tier:** interactive
- **Name:** Todaywall
- **Theme:** realistic, clean; pale cream / faint slate-blue / ink-grey
- **Music:** none (utility)
- **Layout (board-local):** columns at x = −24 / 0 / +24, 20×42 cm cut-out Frames; cards stacked vertically; Add panel at (0, −26, 2)
- **Pin:** World Query look-ray; accept vertical walls only (`|normal·up| < 0.35`); pinch to pin; ghost follows until then
- **Storage:** `todaywall.v1.cards` with 5 sample cards

### Phase 2 assets
- **Icons:** `add.png` (Add button). `check.png` imported, unused.
- **SFX:** `WallPickup.wav`, `WallDrop.wav`, `WallDone.wav`. No background music.
- **Mesh:** SPECS Text-to-3D twice returned a wooden tray+plaque instead of a thin sticky. Rejected those GLBs for gameplay. Cards use UIKit `BackPlate` rounded plates + large Text (matches the prompt’s “simple rounded plates”).
- **UI:** `TodaywallBoardUI` (three cut-out Frames: To do / Doing / Done + counts) and `TodaywallAddUI` (Add + TextInputField + Specs keyboard).

### Phase 3 bootstrap
- Deleted live `Todaydesk` root.
- VirtualScene Phase A create (20 ops, 0 errors) then recompile then Phase B wire (29 ops, 0 errors).
- Hierarchy: `Todaywall` → `TodaywallBoard` (Todo/Doing/Done columns, CardsRoot, Columns UI, Add panel, Audio).
- Runtime logs clean after Frame init ordering. Preview: three see-through columns over Evening Room wall, counts 3/1/1, Add bar at bottom.

Project saved.

## UI polish — readable columns

**Prompt:** Fix the UI — too tight and not readable (headers flattened/overlapping).

**CLAD:** Column Frames no longer billboard (that stacked headers into one smear). FlexLayout was scaling header Text ~25× on X (then to 0); labels are placed as plain Text, not FlexItems. Headers are To do / Doing / Done with counts. Columns spread (~44 cm). Card titles use light ink (Specs additive: dark text vanishes). Add bar slightly larger. Look left/right in Preview to see all three columns — the stereo FOV often shows the center first.

**Prompt:** At first, use a “find a wall” hint instead of the whole board stuck on the camera. Is that clear enough?

**CLAD:** Not too much. Channel is a Specs surface-scan cue. Until a wall hit, only “Look at a wall” is shown (board hidden). After ~2.5s with no wall (typical Evening Room Preview), it adds “Pinch to place in front.” When a wall is found, the ghost board appears on that surface — pinch to pin.

**Prompt:** Cards feel too large vs the buckets. Borders too thick/bold. Make the hierarchy more cohesive.

**CLAD:** Column Frame margin 4cm → 1cm (Small appearance). Cards 18×12 → 14×7.5 with caption-size titles and 10cm stack spacing so notes sit inside the columns, headers stay the larger type.

## Visual hierarchy — headers + counts

**Prompt:** Make To do / Doing / Done bigger and bold, same as the count. Put the number beside the title. Large space between title and number — how to adjust that?

**CLAD:** Combined each column into one line (`To do  3`). Headers use Title2 (~2.4× card type, weight 700). Added Inspector sliders on **TodaywallColumns** → TodaywallBoardUI: `headerFromTopCm` (title from column top) and `headerToCardsCm` (title down to first card). Reset Preview after dragging so the new layout rebuilds.

## Counts + pinch-move cards

**Prompt:** Show counts as To do (3). Let users pinch-move a task to reorder it in a column, and pinch it from To do into Doing or Done.

**CLAD:** Headers now read `To do (3)`. Pinch-grab already existed; drop now inserts by height (reorder in-column, or parking in Doing/Done). Thicker card colliders, stick-to-wall while dragging, siblings open a gap at the landing slot, counts follow the hover column. Order persists.

## Preview pinch not hitting cards

**Prompt:** Can't pinch cards in Preview; no SPECS hardware yet.

**CLAD:** Two Preview blockers: (1) column Frames and card BackPlates each own a full collider/Interactable, so mouse rays never reach the card manipulator; chrome hits are now muted. (2) pin required a SIK targeting pinch that Editor mouse often never fires, so cards stayed disabled — Preview now auto-places the board after ~1s. Click-drag a card (mouse click = pinch).

**Prompt:** Don’t auto-appear the board. Find a wall, pinch to pin, then click-drag cards.

**CLAD:** Removed Preview auto-pin. Ghost board still only shows on a wall hit. Pinch/click that ghost to pin (column Frames stay hittable until pin). After pin, Frames mute so click-drag reaches cards.

## Color palette

**Prompt:** Left-side color palette. Pinch a color, drop it on a card to customize and make the board easier to digest.

**CLAD:** Added a **Colors** rail left of To do (slate, rose, amber, mint, sky, violet). Pinch/drag a chip onto a task; the chip springs home and the card keeps that tint (saved with the board).

## Long task titles

**Prompt:** If the task name is too long, grow the card height so the text fits.

**CLAD:** Titles wrap inside the card. The plate (and collider) grow with the wrapped lines so a long name stays inside instead of spilling off the sides. The stack spacing follows each card’s height.

## Trash drop-zone

**Prompt:** Under the color palette, add a trash icon drop-zone so users can drag a card there to delete it.

**CLAD:** Added a rose **Trash** plate under the Colors rail (filled `delete` icon). Pinch-drag a card onto it — the bin scales up when the card is nearby, then the card is removed from the board and from storage. Chips still snap home after paint.

**Prompt:** Trash can icon should have a border, no color inside.

**CLAD:** Replaced the filled bin with an outlined `delete` glyph (unfilled) and made the drop plate a wireframe: light border, transparent fill.

**Prompt:** Drop the trash border/label and the Colors header. Make Add/+ larger (not bigger than To do/Doing), a bit wider, and lower so it stops touching the columns.

**CLAD:** Palette is chips + outline trash only. Add bar is 44×12 cm, sits lower (~10 cm under the columns), and the +/Add share one button so they no longer overlap. Add type is Headline XL, still smaller than the column titles.

**Prompt:** Wider please.

**CLAD:** Stretched the Add bar to 72 cm and let the field/+ Add fill it (less inset padding, 22 cm Add button).

**Prompt:** Mic-created cards don’t behave like keyboard / sample cards. All task cards should work the same.

**CLAD:** Pinch-drop was only wired on Lens start, so cards added later (mic or keyboard) never snapped into columns. Handlers now attach as soon as a card is spawned. Spoken titles are also cleaned to one line of spaces so wrap/height matching works like typed cards.




