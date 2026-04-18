# TODO
- fix total spent and total income and net balance
- make auto-categorization more accurate
- make spending over time chart x axis me months
- clean up spending by category chart
- fix update button
- add fidelity and coinbase tracking for investment tab?
- test email (for what, I don't know)
- add money flow chart
- add category sankey maker
- fix that once you add something to a category, you can't add it again
- make backend output console errors

## Completed
- Database migration for account_number column
- Update upload endpoint to handle account_number
- Add privacy notice about files staying on user's machine
- Remove 'including First Citizens Bank' text
- Remove backend auto-reload entirely
- Update migration script to handle all missing columns
- Add migration endpoint to backend
- Add migration button to frontend UI with Modal component
- Add port cleanup script to kill existing processes
- Fix migration endpoint database path
- Fix list_uploaded_files to handle missing columns
- Use Modal component for migration and delete confirmations
- Fix delete_file_transactions to use TransactionModel
- Add file list feature with schema error handling

## Current Status
- File list is working and displaying uploaded files
- Database migration is functional via UI button
- Delete confirmation uses Modal component
- Backend requires manual restart for code changes (no auto-reload)

## Notes
- Backend: Run on http://127.0.0.1:8000
- Frontend: Run on http://localhost:3000
- Database: backend/budget.db
- To restart backend: Ctrl+C, then `npm run dev`
