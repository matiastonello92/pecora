export async function setAppContext(orgId?: string, locationId?: string) {
  try {
    await fetch("/functions/v1/set_app_context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        org_id: orgId ?? null,
        location_id: locationId ?? null
      })
    });
  } catch {
    // non bloccare la UI
  }
}
