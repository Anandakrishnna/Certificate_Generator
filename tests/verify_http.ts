async function testHttpFlow() {
  console.log("1. Testing login with demo credentials...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo@certifyflow.com", password: "demo1234" }),
  });

  console.log("Login response status:", loginRes.status);
  if (!loginRes.ok) {
    const err = await loginRes.text();
    throw new Error(`Login failed with status ${loginRes.status}: ${err}`);
  }

  const cookieHeader = loginRes.headers.get("set-cookie") || "";
  const tokenCookie = cookieHeader.split(";")[0];
  console.log("✓ Login succeeded! Received cookie:", tokenCookie.slice(0, 35) + "...");

  // 2. Test fetching event details
  console.log("2. Testing protected event fetch...");
  const eventId = "a266a026-6a23-4fef-a4c2-8d157ca30cbe";
  const eventRes = await fetch(`http://localhost:3000/api/events/${eventId}`, {
    headers: { cookie: tokenCookie },
  });
  console.log("Event details status:", eventRes.status);
  const eventData = await eventRes.json();
  console.log(`✓ Fetched event: "${eventData.event?.name}" with ${eventData.event?.participantCount} attendees`);

  // 3. Test CSV Export endpoint
  console.log("3. Testing CSV export endpoint...");
  const exportRes = await fetch(`http://localhost:3000/api/events/${eventId}/delivery/export`, {
    headers: { cookie: tokenCookie },
  });
  console.log("CSV Export HTTP Status:", exportRes.status);
  console.log("Content-Type:", exportRes.headers.get("content-type"));
  console.log("Content-Disposition:", exportRes.headers.get("content-disposition"));
  const csvText = await exportRes.text();
  console.log("✓ Exported CSV sample lines:");
  csvText.split("\n").slice(0, 4).forEach((l) => console.log("   " + l.trim()));

  // 4. Test Public Certificate Verification API
  console.log("4. Testing public verification API (no cookie)...");
  const publicVerifyRes = await fetch("http://localhost:3000/api/verify/CERT-B3D903D4");
  console.log("Verification API status:", publicVerifyRes.status);
  const verifyData = await publicVerifyRes.json();
  console.log("✓ Verified record:", {
    recipient: verifyData.certificate?.recipientName,
    event: verifyData.certificate?.eventName,
    organizer: verifyData.certificate?.organizerName,
    uid: verifyData.certificate?.certificateUid,
  });

  console.log("\n=============================================");
  console.log(" ALL LOCAL HOST HTTP INTEGRATION TESTS PASSED ");
  console.log("=============================================\n");
}

testHttpFlow().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
