# Data Generation Questions

Before I clear and regenerate the data, I need clarification on:

## 1. Data to Preserve
- **Users**: Should I keep existing users (admin, agents, team leads) or regenerate them too?
- **Master Data**: Should I preserve crops/products master data or regenerate?

## 2. Indian Geography Structure
Please specify or I'll use defaults:

**Territories** (I'll use Indian states/regions):
- North Zone: Punjab, Haryana, Uttar Pradesh, Delhi
- South Zone: Karnataka, Tamil Nadu, Andhra Pradesh, Telangana
- East Zone: West Bengal, Odisha, Bihar
- West Zone: Maharashtra, Gujarat, Rajasthan
- Central Zone: Madhya Pradesh, Chhattisgarh

**Zones**: North, South, East, West, Central

**BU Names** (Business Units - please specify or I'll use generic):
- Option A: Generic (BU-1, BU-2, etc.)
- Option B: Product-based (Seeds BU, Crop Protection BU, etc.)
- Option C: Your specific BU names?

## 3. Activity Distribution
- **100 activities** - How should they be distributed?
  - By type: Field Day, Group Meeting, Demo Visit, OFM, Other
  - By territory/zone
  - Date range (last 30 days? last 90 days?)

## 4. Farmer Distribution
- **500 farmers** - How should they be distributed?
  - By territory/zone
  - By language (Hindi, Telugu, Marathi, Kannada, Tamil, Bengali, Oriya, English, Malayalam)
  - Mobile numbers: Should I generate valid Indian mobile numbers (10 digits starting with 6-9)?

## 5. Agents
- **Languages**: Which languages should agents speak?
  - All languages? Or specific ones?
- **How many agents** per language?
- **Agent names**: Should I use Indian names?

## 6. Call Tasks
- Should I create **call tasks** linking farmers to activities?
- If yes, what **status distribution**?
  - sampled_in_queue, in_progress, completed, etc.
- How many tasks per activity?

## 7. Other Data
- **Cooling Periods**: Should I generate these?
- **Sampling Config**: Should I preserve or regenerate?
- **Allocation Runs**: Should I create any?

---

**My Recommendation (if you want me to proceed with defaults):**
- Keep existing users
- Use Indian states as territories
- Use 5 zones (North, South, East, West, Central)
- Use generic BU names (BU-North, BU-South, etc.)
- Distribute activities evenly across types and zones
- Distribute farmers by language based on territory (e.g., Telugu in South, Hindi in North)
- Create call tasks with mixed statuses
- Generate valid Indian mobile numbers

Please confirm or specify your preferences!
