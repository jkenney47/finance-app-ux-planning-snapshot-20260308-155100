# Gemini Plan Review

- Plan: `docs/plans/2026-03-06-remaining-repo-optimization-execution-packet.md`
- Generated-At-UTC: 2026-03-06T10:51:29Z
- Model: gemini-3.1-pro-preview

MCP issues detected. Run /mcp list for status.Here is my critique of the implementation plan, focusing strictly on your specified criteria:

### 1. P0/P1/P2 Risks
- **P1 (Access Control on Route Groups):** Moving `(ops)` and `(internal)` out of `(dashboard)` makes them root-level siblings under the main `AuthGate`. While `AuthGate` ensures users are signed in, it does not check roles. **Risk:** If the individual screens previously relied on any dashboard-level context or if they lack robust inline admin-checks, regular authenticated users could deep-link into `/(ops)/...`. 
- **P2 (Import Breakages):** Moving screens like `agent-hub.tsx` up a directory level to `app/(ops)` will break any relative component/hook imports.

### 2. Missing Steps or Hidden Dependencies
- **Auth/Role Gating in Layout:** The plan must explicitly add role-based authorization gating to the new `app/(ops)/_layout.tsx` and `app/(internal)/_layout.tsx` files.
- **Jest/Deno Environment Bleed:** When extracting `providerInvocation.ts` out of the edge function, ensure it does not accidentally pull in Deno-native imports (`https://...` or `Deno.env`) which will immediately break Jest unless properly mocked or abstracted in the pure module. 

### 3. Frontend State Coverage
- **Loading State in Ops Layout:** If `app/(ops)/_layout.tsx` implements a role check (e.g., verifying admin status from Supabase), it needs an explicit loading state (spinner or skeleton) to prevent flashing the `(ops)` screens before the promise resolves or rejecting prematurely.
- **Error State for Unauthorized Access:** The ops layout must define an empty/error state (e.g., "Unauthorized Access") if a standard user attempts to render the route.

### 4. Accessibility Risks
- **Focus Loss on Redirect:** The temporary redirect wrappers in `app/(dashboard)` using `<Redirect>` (or `router.replace()`) on mount will cause abrupt context shifts. Ensure these transitions do not strand screen reader focus. 

### 5. Concrete Tests to Add or Run
- **Test:** Add an explicit test (Jest or Maestro) verifying that a **non-admin** authenticated user is rejected or redirected when trying to directly access `/(ops)/agent-hub` and `/(internal)/ui-lab`. 
- **Run:** `npx jest __tests__/supabase/functions/agentGateway.test.ts --watchAll=false` to ensure the Deno-free pure function executes locally without transpilation hacks.

### 6. Simpler Alternatives 
- **Route Wrapper Simplification:** Rather than creating full stub files like `app/(dashboard)/agent-hub.tsx` just to execute redirects, you can use Expo Router's built-in `expo-router` redirect functionality or simply export `<Redirect href="/(ops)/agent-hub" />` in those stubs to keep the boilerplate to strictly one line.
