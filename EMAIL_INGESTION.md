# Email Ingestion Setup

To enable forwarding emails to your Music Planner calendar for free, you can use **Make.com** to catch emails and forward them to the webhook endpoint in this application.

## 1. Get Your Webhook URL
Once your Next.js app is deployed (e.g., on Vercel or Render), your webhook URL will be:
`https://YOUR_DOMAIN.com/api/webhooks/email`

*(If you are running locally, you can use a tool like `ngrok` or `localtunnel` to get a public URL for testing).*

## 2. Set Up Make.com (Free Tier)
Make.com allows you to set up a custom email address that triggers a webhook.

1. Create a free account at [Make.com](https://www.make.com/).
2. Create a new Scenario.
3. Click the `+` icon to add a module and search for **Webhooks**.
4. Select **Custom Mailhook**.
5. Click **Add** to create a new webhook. Name it "Music Planner Ingestion".
6. Make.com will generate a unique email address for you (e.g., `xxxxxxxx@hook.make.com`). **Copy this email address.** This is the address you will forward your concert/rehearsal emails to.
7. Click **OK**.

## 3. Connect the Mailhook to your App
1. Hover over the right side of the Mailhook module you just created and click `Add another module`.
2. Search for **HTTP** and select **Make a request**.
3. Configure the HTTP module as follows:
   - **URL**: `https://YOUR_DOMAIN.com/api/webhooks/email`
   - **Method**: `POST`
   - **Body type**: `Raw`
   - **Content type**: `JSON (application/json)`
   - **Request content**:
     ```json
     {
       "text": "{{1.text}}"
     }
     ```
     *(Note: `{{1.text}}` is the dynamic variable Make.com uses for the plaintext body of the email. You can select it from the variable picker).*
4. Click **OK**.

## 4. Test and Activate
1. Click the **Run once** button in the bottom left of Make.com.
2. Send an email to the generated Make.com email address with some mock concert details in the body.
   *Example Body: "Hey everyone, we have a rehearsal for the Beethoven 9th on Friday, October 27th at 7:00 PM. It will be chorus only, no percussion needed."*
3. Make.com should receive the email and forward the text to your Next.js app.
4. Check your Music Planner dashboard. You should see a new project called "Email Ingested" and the new event populated on the calendar!
5. Once confirmed working, turn the scenario switch to **ON** (bottom left corner) to run continuously.

## Environment Variables
Ensure the following environment variables are set in your deployment environment (e.g., Vercel):
- `GROQ_API_KEY`: Your Groq API key (used to parse the unstructured email text).
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key.
