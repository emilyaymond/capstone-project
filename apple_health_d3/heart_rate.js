//------------------------------------------------------------
// ✅ Moving average (smoother)
function movingAverage(data, windowSize = 40) {
  return data.map((d, i) => {
    const start = Math.max(0, i - windowSize);
    const subset = data.slice(start, i + 1);
    return {
      date: d.date,
      value: d3.mean(subset, x => x.value)
    };
  });
}

//------------------------------------------------------------
// ✅ Load data
d3.csv("data/RestingHeartRate.csv").then(raw => {

  const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");

  raw.forEach(d => {
    // Clean timezone off date
    const cleaned = d.startDate.split(" ").slice(0,2).join(" ");
    d.date = parseDate(cleaned);
    d.value = +d.value;
  });

  // Keep valid points
  raw = raw.filter(d => d.date && !isNaN(d.value));
  raw.sort((a, b) => a.date - b.date);

  console.log("✅ Parsed rows:", raw.length);

  //------------------------------------------------------------
  // ✅ Group by week start
  function getWeekStart(d) {
    let s = new Date(d);
    s.setHours(0,0,0,0);
    s.setDate(s.getDate() - s.getDay()); // Sunday start
    return s;
  }

  const weeks = d3.groups(raw, d => +getWeekStart(d.date))
    .map(([weekStart, records]) => ({
      weekStart: new Date(+weekStart),
      records
    }));

  console.log("✅ Total Weeks:", weeks.length);

  //------------------------------------------------------------
  // ✅ UI
  const slider = document.getElementById("weekRange");
  const weekLabel = document.getElementById("weekLabel");
  slider.max = weeks.length - 1;

  //------------------------------------------------------------
  // ✅ Chart setup
  const margin = { top: 60, right: 40, bottom: 60, left: 60 };
  const width = 1000 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  // Axes
  const xAxis = g.append("g").attr("transform", `translate(0,${height})`);
  const yAxis = g.append("g");

  // Labels
  g.append("text")
    .attr("x", width/2)
    .attr("y", -22)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Apple Health: Heart Rate (Weekly)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -45)
    .attr("x", -height/2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Heart Rate (bpm)");

  //------------------------------------------------------------
  // ✅ Lines
  const rawLine = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

  const smoothLine = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => x(d.date))
    .y(d => y(d.value));

  // Paths
  const rawPath = g.append("path")
    .attr("fill", "none")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4 4");

  const smoothPath = g.append("path")
    .attr("fill", "none")
    .attr("stroke", "#e63946")
    .attr("stroke-width", 3);

  //------------------------------------------------------------
  // ✅ Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

  //------------------------------------------------------------
  // ✅ Update chart
  function update(index) {
    const week = weeks[index];
    weekLabel.textContent = week.weekStart.toDateString();

    const data = week.records;
    const smoothed = movingAverage(data, 40);

    x.domain(d3.extent(data, d => d.date));
    y.domain([
      d3.min(data, d => d.value) - 10,
      d3.max(data, d => d.value) + 10
    ]);

    xAxis.call(d3.axisBottom(x));
    yAxis.call(d3.axisLeft(y));

    rawPath.datum(data).attr("d", rawLine);
    smoothPath.datum(smoothed).attr("d", smoothLine);

    // Hover dots
    g.selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.value))
      .attr("r", 3)
      .attr("fill", "#e63946")
      .on("mouseenter", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`
            <strong>${d.date.toLocaleString()}</strong><br>
            ${d.value} bpm
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0);
      });
  }

  update(0);

  slider.addEventListener("input", e => update(+e.target.value));
});
