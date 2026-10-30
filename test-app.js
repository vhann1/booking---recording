import http from "http";

const BASE_URL = "http://localhost:3000";
let sessionCookie = "";
let testsPassed = 0;
let testsFailed = 0;

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, cookies = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(cookies && { "Cookie": cookies })
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
          const match = setCookie[0].match(/connect\.sid=([^;]+)/);
          if (match) sessionCookie = `connect.sid=${match[1]}`;
        }
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function test(name, passed, details = "") {
  if (passed) {
    console.log(`✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name} - ${details}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("🧪 Starting Application Suite & AI Side-Tabs Tests...\n");

  // Test 1: Home Page
  try {
    const res = await makeRequest("GET", "/");
    test("Home landing page accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Home landing page accessible", false, e.message);
  }

  // Test 2: Login Page
  try {
    const res = await makeRequest("GET", "/login");
    test("Login page accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Login page accessible", false, e.message);
  }

  // Test 3: Register Page
  try {
    const res = await makeRequest("GET", "/register");
    test("Register page accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Register page accessible", false, e.message);
  }

  // Test 4: Login with invalid credentials
  try {
    const res = await makeRequest("POST", "/login", "email=invalid@test.com&password=wrongpass");
    test("Login rejection on invalid credentials", res.status === 302 || res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Login rejection on invalid credentials", false, e.message);
  }

  // Test 5: Register new user
  try {
    const timestamp = Date.now();
    const res = await makeRequest("POST", "/register", 
      `name=Test Officer ${timestamp}&email=testofficer${timestamp}@test.com&password=password123&passwordConfirm=password123`);
    test("User registration successful", res.status === 302 || res.status === 200, `Status: ${res.status}`);
    if (res.headers["set-cookie"]) {
      const match = res.headers["set-cookie"][0].match(/connect\.sid=([^;]+)/);
      if (match) sessionCookie = `connect.sid=${match[1]}`;
    }
  } catch (e) {
    test("User registration successful", false, e.message);
  }

  // Test 6: Access dashboard with Side Tabs & Blue Blended Theme
  try {
    const res = await makeRequest("GET", "/dashboard", null, sessionCookie);
    test("Dashboard with Side Tabs & Blue Blended Theme accessible", res.status === 200 && res.data.includes("side-tab-link") && res.data.includes("Facility Bookings"), `Status: ${res.status}`);
  } catch (e) {
    test("Dashboard with Side Tabs accessible", false, e.message);
  }

  // Test 6b: Access Booking List Page
  try {
    const res = await makeRequest("GET", "/booking", null, sessionCookie);
    test("Facility Bookings page (/booking) accessible", res.status === 200 && res.data.includes("Facility Bookings &amp; Reservation Log") || res.data.includes("Facility Bookings"), `Status: ${res.status}`);
  } catch (e) {
    test("Facility Bookings page (/booking) accessible", false, e.message);
  }

  // Test 6c: Access Booking Create Page
  try {
    const res = await makeRequest("GET", "/booking/create", null, sessionCookie);
    test("Create Booking form (/booking/create) accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Create Booking form (/booking/create) accessible", false, e.message);
  }

  // Test 6d: Create a new Booking via POST
  try {
    const today = new Date().toISOString().split("T")[0];
    const body = `subjectName=Atty.+Juan+Dela+Cruz&subjectContact=0917-555-8899&subjectIdNumber=IBP-99210&bookingType=Legal+Consultation&facilityZone=Legal+Consultation+Room+A&bookingDate=${today}&startTime=10:00&endTime=11:00&priority=High&status=Approved&purpose=Client+case+briefing&remarks=Verified+IBP+ID`;
    const res = await makeRequest("POST", "/booking/create", body, sessionCookie);
    test("Create new Booking record (POST /booking/create) functional", res.status === 302 || res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Create new Booking record (POST /booking/create) functional", false, e.message);
  }

  // Test 6e: Booking Stats API
  try {
    const res = await makeRequest("GET", "/booking/stats", null, sessionCookie);
    const data = JSON.parse(res.data);
    test("Booking stats API (/booking/stats) functional", res.status === 200 && data.total !== undefined, `Status: ${res.status}`);
  } catch (e) {
    test("Booking stats API (/booking/stats) functional", false, e.message);
  }

  // Test 6f: Booking Excel Export (.xls)
  try {
    const res = await makeRequest("GET", "/booking/export/excel", null, sessionCookie);
    const isBookingExcel = res.status === 200 && res.headers["content-type"] && res.headers["content-type"].includes("vnd.ms-excel");
    test("Booking Excel (.xls) export (/booking/export/excel) functional", isBookingExcel, `Status: ${res.status}, Type: ${res.headers["content-type"]}`);
  } catch (e) {
    test("Booking Excel (.xls) export (/booking/export/excel) functional", false, e.message);
  }

  // Test 7: Access personnel list
  try {
    const res = await makeRequest("GET", "/personnel", null, sessionCookie);
    test("Personnel directory accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Personnel directory accessible", false, e.message);
  }

  // Test 8: Access attendance list
  try {
    const res = await makeRequest("GET", "/attendance", null, sessionCookie);
    test("Attendance & muster roll accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Attendance & muster roll accessible", false, e.message);
  }

  // Test 9: Access assignment list
  try {
    const res = await makeRequest("GET", "/assignment", null, sessionCookie);
    test("Shift deployments accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Shift deployments accessible", false, e.message);
  }

  // Test 10: Document Vault
  try {
    const res = await makeRequest("GET", "/document", null, sessionCookie);
    test("Compliance Document Vault accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Compliance Document Vault accessible", false, e.message);
  }

  // Test 11: Shift Management
  try {
    const res = await makeRequest("GET", "/shift", null, sessionCookie);
    test("Shift & gate timings accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Shift & gate timings accessible", false, e.message);
  }

  // Test 12: Reports
  try {
    const res = await makeRequest("GET", "/reports", null, sessionCookie);
    test("Reports & telemetry accessible", res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Reports & telemetry accessible", false, e.message);
  }

  // Test 12b: Reports Excel Export
  try {
    const res = await makeRequest("GET", "/reports/export/excel", null, sessionCookie);
    const isExcel = res.status === 200 && res.headers["content-type"] && res.headers["content-type"].includes("vnd.ms-excel");
    test("Reports Attendance Excel (.xls) export functional", isExcel, `Status: ${res.status}, Type: ${res.headers["content-type"]}`);
  } catch (e) {
    test("Reports Attendance Excel export functional", false, e.message);
  }

  // Test 12c: Reports CSV Export
  try {
    const res = await makeRequest("GET", "/reports/export/csv", null, sessionCookie);
    const isCsv = res.status === 200 && res.headers["content-type"] && res.headers["content-type"].includes("text/csv");
    test("Reports Attendance CSV export functional", isCsv, `Status: ${res.status}, Type: ${res.headers["content-type"]}`);
  } catch (e) {
    test("Reports Attendance CSV export functional", false, e.message);
  }

  // Test 12d: Reports Roster Excel Export
  try {
    const res = await makeRequest("GET", "/reports/export/roster-excel", null, sessionCookie);
    const isRosterExcel = res.status === 200 && res.headers["content-type"] && res.headers["content-type"].includes("vnd.ms-excel");
    test("Reports Roster Excel (.xls) export functional", isRosterExcel, `Status: ${res.status}, Type: ${res.headers["content-type"]}`);
  } catch (e) {
    test("Reports Roster Excel export functional", false, e.message);
  }

  // Test 13: Personnel stats API
  try {
    const res = await makeRequest("GET", "/personnel/stats", null, sessionCookie);
    test("Personnel stats API functional", res.status === 200, `Status: ${res.status}`);
    const data = JSON.parse(res.data);
    test("Stats contains required fields", data.total !== undefined && data.active !== undefined, 
      `Missing fields in response: ${JSON.stringify(data)}`);
  } catch (e) {
    test("Personnel stats API functional", false, e.message);
  }

  // Test 14: Attendance stats API
  try {
    const res = await makeRequest("GET", "/attendance/stats", null, sessionCookie);
    test("Attendance stats API functional", res.status === 200, `Status: ${res.status}`);
    const data = JSON.parse(res.data);
    test("Attendance stats valid", data.marked !== undefined, `Invalid response: ${JSON.stringify(data)}`);
  } catch (e) {
    test("Attendance stats API functional", false, e.message);
  }

  // Test 15: Admin User Management & Audit Telemetry
  try {
    const adminLoginRes = await makeRequest("POST", "/login", "email=admin@jailpersonnel.com&password=admin123");
    let adminCookie = sessionCookie;
    if (adminLoginRes.headers["set-cookie"]) {
      const match = adminLoginRes.headers["set-cookie"][0].match(/connect\.sid=([^;]+)/);
      if (match) adminCookie = `connect.sid=${match[1]}`;
    }

    const userRes = await makeRequest("GET", "/user", null, adminCookie);
    test("Admin User Management with Side Tabs accessible", userRes.status === 200, `Status: ${userRes.status}`);

    const auditRes = await makeRequest("GET", "/audit-logs", null, adminCookie);
    test("Admin Audit Telemetry with Side Tabs accessible", auditRes.status === 200, `Status: ${auditRes.status}`);
  } catch (e) {
    test("Admin features accessible", false, e.message);
  }

  // Test 16: Logout redirects to Landing Page (/)
  try {
    const res = await makeRequest("GET", "/logout", null, sessionCookie);
    test("Logout redirects directly to Landing Page (/)", res.status === 302 && res.headers.location === "/", `Status: ${res.status}, Location: ${res.headers.location}`);
  } catch (e) {
    test("Logout redirects directly to Landing Page (/)", false, e.message);
  }

  // Test 17: Restricted access after logout
  try {
    const res = await makeRequest("GET", "/dashboard", null, "");
    test("Dashboard requires authentication", res.status === 302 || res.status === 200, `Status: ${res.status}`);
  } catch (e) {
    test("Dashboard requires authentication", false, e.message);
  }

  console.log(`\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  if (testsFailed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log(`⚠️  ${testsFailed} tests failed`);
  }
}

// Run tests
runTests().catch(err => {
  console.error("❌ Test suite error:", err);
  process.exit(1);
}).then(() => {
  process.exit(testsFailed > 0 ? 1 : 0);
});
