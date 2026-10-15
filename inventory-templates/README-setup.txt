PIECE PAVILION - INVENTORY TRACKING GOOGLE SHEET SETUP
=======================================================

HOW TO IMPORT INTO GOOGLE SHEETS:
1. Go to Google Sheets (sheets.google.com) and create a new blank spreadsheet
2. Name it "Piece Pavilion Inventory"
3. For each CSV file, do:
   a. Create a new tab (click the + at the bottom)
   b. Name the tab (Inventory, Sales, Purchases, Dashboard)
   c. Go to File > Import > Upload > select the CSV
   d. Choose "Replace current sheet" and click Import

TAB OVERVIEW:
- Inventory: Master list of every item. This is your source of truth.
- Sales: One row per sale/order. Link back to Inventory via BrickLink Item #.
- Purchases: Track each buying trip or lot. Helps you see ROI per source.
- Dashboard: Summary metrics. Use the formulas in column B as a starting point.

WORKFLOW:
1. BUY: Add a row to Purchases tab, then add each item to Inventory tab
2. LIST: When you list on BrickLink, update "Listed on BrickLink?" and "Date Listed"
3. SELL: When an order comes in, add a row to Sales tab and update Qty Sold in Inventory
4. REVIEW: Check Dashboard tab to see how the business is doing

TIPS:
- Use Data Validation on the "Status" column: In Stock, Sold Out, Unlisted, Returned
- Use Data Validation on "Condition": New, Used
- Use Data Validation on "Source Type": In Person, Online, Wholesale
- Freeze the header row (View > Freeze > 1 row) on each tab
- Use conditional formatting to highlight unlisted items or low stock
- The formulas in the CSVs use = signs — they'll activate once imported

FUTURE: When you're ready to automate with the BrickLink API, the column
structure here maps directly to the API fields, making it easy to script later.
