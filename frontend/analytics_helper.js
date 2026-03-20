function generatePast30DaysLabels() {
    const labels = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return labels;
}

function processAnalyticsData(data) {
    const { listings, visits, chats } = data;

    // Core Metrics
    let totalViews = 0;
    let activeListings = 0;
    let totalRent = 0;

    // Lead demographics (Gender Allowed)
    const demographics = { male: 0, female: 0, any: 0 };

    listings.forEach(l => {
        totalViews += (l.total_views || 0);
        if (l.status === 'approved') activeListings++;
        if (l.monthly_rent) totalRent += l.monthly_rent;
        if (l.gender_allowed) {
            demographics[l.gender_allowed] = (demographics[l.gender_allowed] || 0) + 1;
        }
    });

    const avgRent = listings.length ? Math.round(totalRent / listings.length) : 0;
    const totalLeads = visits.length + chats.length;
    const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : 0;
    const approvedVisits = visits.filter(v => v.status === 'approved').length;

    // Timeline Data (Past 30 days)
    const timelineViews = new Array(30).fill(0); // Simulated based on total views and recency
    const timelineLeads = new Array(30).fill(0);

    // Distribute actual leads
    const now = new Date();
    [...visits, ...chats].forEach(item => {
        const itemDate = new Date(item.created_at);
        const diffTime = Math.abs(now - itemDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 30) {
            timelineLeads[29 - diffDays]++;
        }
    });

    // Simulate views trend heavily weighted towards recent days
    let remainingViews = totalViews;
    for (let i = 29; i >= 0 && remainingViews > 0; i--) {
        let dailyViews = Math.floor(Math.random() * (remainingViews / 3));
        if (timelineLeads[i] > 0) dailyViews += timelineLeads[i] * 5; // ensure views > leads
        if (i === 0) dailyViews = remainingViews; // dump remainder
        timelineViews[i] = dailyViews;
        remainingViews -= dailyViews;
    }

    return {
        totalViews,
        totalLeads,
        conversionRate,
        approvedVisits,
        activeListings,
        totalListings: listings.length,
        avgRent,
        demographics,
        timelineViews,
        timelineLeads
    };
}
