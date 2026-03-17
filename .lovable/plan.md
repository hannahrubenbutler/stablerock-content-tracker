

## Plan: Owner & Stage Field Access Control

### What changes

**1. SubmitForm — auto-default Owner to "Archway"**
- Line 93 in SubmitForm.tsx: change `owner: null` to `owner: 'Archway'`
- No Owner or Stage fields shown on the form (already the case for Stage; Owner was already `null` but now defaults)

**2. Owner dropdown options (shared constant)**
- Add `OWNER_OPTIONS` to `src/lib/constants.ts`: `['Archway', 'Kevin + Archway', 'Archway + J&A', 'Abby (self-post)', 'April', 'Kevin']`

**3. DetailModal — role-gated Owner & Stage**
- Import `useAuth` to get `isAdmin`
- **Stage selector** (lines 209-223): If `!isAdmin`, render a read-only styled badge instead of `<select>`. Admin keeps the dropdown.
- **Owner field** (lines 331-338): If `isAdmin && editing`, render a `<select>` with `OWNER_OPTIONS` + an "Other" option that switches to a free-text input. If `isAdmin && !editing`, show the value as text. If `!isAdmin`, hide the Owner field entirely.
- **Edit button** (line 404): Only show for admin users
- **Delete section** (lines 481-503): Only show for admin users
- Move Owner, Actual Publish Date, "What's Needed from Client" (editing mode) into an "Archway Internal" section visible only to admins

**4. AllRequests table — role-gated Stage & Owner**
- Import `useAuth`
- **Stage column** (lines 220-234): If `!isAdmin`, render a read-only badge instead of `<select>`
- **Owner column** (line 240): If `isAdmin`, render an inline `<select>` dropdown with `OWNER_OPTIONS` + "Other". If `!isAdmin`, show as plain text.

**5. No database changes needed** — Owner is already a text field, Stage is already an enum. Just UI/role gating.

### Files to edit
- `src/lib/constants.ts` — add `OWNER_OPTIONS`
- `src/components/SubmitForm.tsx` — default owner to `'Archway'`
- `src/components/DetailModal.tsx` — role-gate Stage, Owner, Edit, Delete; Owner becomes dropdown for admins
- `src/components/AllRequests.tsx` — role-gate Stage dropdown and Owner column

