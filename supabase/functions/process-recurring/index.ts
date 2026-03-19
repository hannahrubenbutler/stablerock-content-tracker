import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
    const todayStr = today.toISOString().split("T")[0];

    // Get all active recurring requests matching today's day of week
    const { data: recurring, error } = await supabase
      .from("requests")
      .select("*")
      .eq("is_recurring", true)
      .eq("recurrence_day_of_week", dayOfWeek);

    if (error) throw error;

    let created = 0;

    for (const parent of recurring || []) {
      // Skip if end date has passed
      if (parent.recurrence_end_date && parent.recurrence_end_date < todayStr) {
        continue;
      }

      // For biweekly: check if it's been 2 weeks since parent creation
      if (parent.recurrence_pattern === "biweekly") {
        const createdDate = new Date(parent.created_at);
        const diffDays = Math.floor(
          (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const weeksSinceCreation = Math.floor(diffDays / 7);
        if (weeksSinceCreation % 2 !== 0) continue;
      }

      // For monthly: only on the same week-of-month as creation
      if (parent.recurrence_pattern === "monthly") {
        const createdDate = new Date(parent.created_at);
        const createdWeekOfMonth = Math.ceil(createdDate.getDate() / 7);
        const todayWeekOfMonth = Math.ceil(today.getDate() / 7);
        if (createdWeekOfMonth !== todayWeekOfMonth) continue;
      }

      // Check if we already created one today for this parent
      const { data: existing } = await supabase
        .from("requests")
        .select("id")
        .eq("parent_request_id", parent.id)
        .gte("created_at", todayStr + "T00:00:00Z")
        .lte("created_at", todayStr + "T23:59:59Z")
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Create new request from parent template
      const { error: insertError } = await supabase.from("requests").insert({
        title: parent.title,
        description: parent.description,
        service_line: parent.service_line,
        content_type: parent.content_type,
        stage: "Requested",
        priority: parent.priority,
        target_date: todayStr,
        context: parent.context,
        assets_available: parent.assets_available,
        submitter_name: parent.submitter_name,
        contact_person: parent.contact_person,
        owner: parent.owner || "Archway",
        date_mode: "specific",
        parent_request_id: parent.id,
        is_recurring: false,
      });

      if (insertError) {
        console.error(`Failed to create recurring request from ${parent.id}:`, insertError);
      } else {
        created++;
      }
    }

    return new Response(JSON.stringify({ success: true, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-recurring error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
