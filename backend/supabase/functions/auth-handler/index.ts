import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = "re_jntQeSye_3LWjU3EhBPZEUEvAeaDBtr5h"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { action, email, token, password } = await req.json()
    const origin = req.headers.get("origin") || "http://localhost:5173"

    // ─── ACTION: SEND VERIFICATION ─────────────────────────────────────────────
    if (action === "send-verification") {
      if (!email) throw new Error("Email is required")
      const newToken = crypto.randomUUID()
      const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      
      const { error: updateError } = await supabase.from("profiles").update({
        verification_token: newToken,
        verification_token_expires_at: expiry,
        is_verified: false
      }).eq("email", email)

      if (updateError) throw updateError

      const verificationLink = `${origin}/#/verify-email?token=${newToken}`
      const logoUrl = `https://placehold.co/400x100/000000/FFFFFF/png?text=STAYNEST`; // Placeholder for premium look if no hosted logo found
      
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "StayNest <auth@staynest.in>",
          to: [email],
          subject: "Verify your StayNest account",
          html: `
<div style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial, sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:10px;padding:30px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <!-- Logo -->
    <div style="margin-bottom:20px; font-size: 24px; font-weight: 900; color: #3b82f6; display: flex; align-items: center; justify-content: center; gap: 8px;">
      <span style="font-size: 30px;">🏠</span> StayNest
    </div>

    <!-- Heading -->
    <h2 style="margin-top:10px;color:#222;font-size:20px;">
      Verify your email
    </h2>

    <!-- Message -->
    <p style="color:#555;font-size:14px;line-height:1.6;margin-top:10px;">
      Thanks for signing up! Please confirm your email address to activate your account and start exploring rooms and PGs.
    </p>

    <!-- Button -->
    <a href="${verificationLink}"
       style="
         display:inline-block;
         margin-top:25px;
         padding:14px 24px;
         background-color:#000;
         color:#ffffff;
         text-decoration:none;
         border-radius:8px;
         font-size:14px;
         font-weight:600;
       ">
       Verify Account
    </a>

    <!-- Expiry -->
    <p style="margin-top:20px;color:#888;font-size:12px;">
      This link will expire in 10 minutes.
    </p>

    <!-- Divider -->
    <hr style="margin:25px 0;border:none;border-top:1px solid #eee;" />

    <!-- Fallback -->
    <p style="font-size:12px;color:#888;line-height:1.5;">
      If the button doesn’t work, copy and paste this link into your browser:
      <br/>
      <span style="word-break:break-all;color:#3b82f6;">
        ${verificationLink}
      </span>
    </p>

    <!-- Footer -->
    <p style="margin-top:20px;font-size:12px;color:#aaa;">
      If you didn’t create this account, you can safely ignore this email.
    </p>
  </div>
</div>
          `,
        }),
      })

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ─── ACTION: VERIFY TOKEN ──────────────────────────────────────────────────
    if (action === "verify-token") {
      if (!token) throw new Error("Token is required")
      const { data: profile, error: fetchError } = await supabase.from("profiles")
        .select("id")
        .eq("verification_token", token)
        .gt("verification_token_expires_at", new Date().toISOString())
        .single()

      if (fetchError || !profile) throw new Error("Invalid or expired verification link")

      await supabase.from("profiles").update({
        is_verified: true,
        verification_token: null,
        verification_token_expires_at: null
      }).eq("id", profile.id)

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ─── ACTION: SEND RESET PASSWORD ───────────────────────────────────────────
    if (action === "send-reset") {
      if (!email) throw new Error("Email is required")
      const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).single()
      if (!profile) {
        // Silent success for security
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const newToken = crypto.randomUUID()
      const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      
      await supabase.from("profiles").update({
        reset_token: newToken,
        reset_token_expires_at: expiry
      }).eq("id", profile.id)

      const resetLink = `${origin}/#/reset-password?token=${newToken}`
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "StayNest <auth@staynest.in>",
          to: [email],
          subject: "Reset your StayNest password",
          html: `
<div style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial, sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:10px;padding:30px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <!-- Logo -->
    <div style="margin-bottom:20px; font-size: 24px; font-weight: 900; color: #3b82f6; display: flex; align-items: center; justify-content: center; gap: 8px;">
      <span style="font-size: 30px;">🏠</span> StayNest
    </div>

    <!-- Heading -->
    <h2 style="margin-top:10px;color:#222;font-size:20px;">
      Reset your password
    </h2>

    <!-- Message -->
    <p style="color:#555;font-size:14px;line-height:1.6;margin-top:10px;">
      We received a request to reset your StayNest password. Click the button below to set a new password.
    </p>

    <!-- Button -->
    <a href="${resetLink}"
       style="
         display:inline-block;
         margin-top:25px;
         padding:14px 24px;
         background-color:#000;
         color:#ffffff;
         text-decoration:none;
         border-radius:8px;
         font-size:14px;
         font-weight:600;
       ">
       Reset Password
    </a>

    <!-- Expiry -->
    <p style="margin-top:20px;color:#888;font-size:12px;">
      This link will expire in 10 minutes. <b>If you didn't request this, you can safely ignore this email.</b>
    </p>

    <!-- Divider -->
    <hr style="margin:25px 0;border:none;border-top:1px solid #eee;" />

    <!-- Fallback -->
    <p style="font-size:12px;color:#888;line-height:1.5;">
      If the button doesn’t work, copy and paste this link into your browser:
      <br/>
      <span style="word-break:break-all;color:#3b82f6;">
        ${resetLink}
      </span>
    </p>

    <!-- Footer -->
    <p style="margin-top:20px;font-size:12px;color:#aaa;">
      StayNest - Your verified PG Partner.
    </p>
  </div>
</div>
          `,
        }),
      })

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ─── ACTION: RESET PASSWORD ────────────────────────────────────────────────
    if (action === "reset-password") {
      if (!token || !password) throw new Error("Token and password are required")
      const { data: profile, error: fetchError } = await supabase.from("profiles")
        .select("id")
        .eq("reset_token", token)
        .gt("reset_token_expires_at", new Date().toISOString())
        .single()

      if (fetchError || !profile) throw new Error("Invalid or expired reset link")

      // Update Supabase Auth password using admin API
      const { error: authError } = await supabase.auth.admin.updateUserById(profile.id, { 
        password: password 
      })
      if (authError) throw authError

      // Clear token
      await supabase.from("profiles").update({
        reset_token: null,
        reset_token_expires_at: null
      }).eq("id", profile.id)

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
