//------------------------------------------------------------
// MOVING AVERAGE (simple SMA)
function movingAverageRHR(data, windowSize) {
  return data.map((d, i) => {
    const start = Math.max(0, i - windowSize);
    const slice = data.slice(start, i + 1);
    return {
      date: d.date,
      value: d3.mean(slice, x => x.value)
    };
  });
}

//------------------------------------------------------------
// LOAD RESTING HR
d3.csv("data/RestingHeartRate.csv").then(raw => {

  const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S %Z");

  raw.forEach(d => {
    d.date = parseDate(d.startDate);
    d.value = +d.value;
  });

  raw = raw.filter(d => d.date && !isNaN(d.value));
  raw.sort((a, b) => a.date - b.date);

  //------------------------------------------------------------
  // DAILY AGGREGATION
  const daily = d3.groups(raw, d => d3.timeDay(d.date))
    .map(([day, rec]) => ({
      date: new Date(day),
      value: d3.mean(rec, r => r.value)
    }));

  //------------------------------------------------------------
  // BUILD MONTH LIST
  const months = d3.groups(daily, d => d3.timeMonth(d.date))
    .map(([monthStart]) => ({
      start: new Date(monthStart),
      end: d3.timeMonth.offset(new Date(monthStart), 1),
      label: d3.timeFormat("%B %Y")(new Date(monthStart))
    }));

  window.rhrMonths = months;
  window.dailyRHR = daily;

  // Populate month dropdown
  const monthSelect = document.getElementById("month-select");
  months.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = m.label;
    monthSelect.appendChild(opt);
  });

  // Default to last month
  monthSelect.value = months.length - 1;

});

//------------------------------------------------------------
// DRAW RESTING HR (Apple Health Premium Style)
window.drawRestingHR = function(svg) {
  svg.selectAll("*").remove();

  const months = window.rhrMonths;
  const daily = window.dailyRHR;
  if (!months || !daily) return;

  const monthIdx = +document.getElementById("month-select").value;
  const month = months[monthIdx];

  // Filter to month
  const monthData = daily.filter(
    d => d.date >= month.start && d.date < month.end
  );

  const ma7 = movingAverageRHR(monthData, 7);
  const ma30 = movingAverageRHR(monthData, 30);
  const monthlyAvg = d3.mean(monthData, d => d.value);

  //------------------------------------------------------------
  // CHART SETUP
  const margin = { top: 80, right: 40, bottom: 60, left: 60 };
  const width = svg.node().clientWidth - margin.left - margin.right;
  const height = svg.node().clientHeight - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  //------------------------------------------------------------
  // SCALES
  const x = d3.scaleTime()
    .domain([month.start, month.end])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([45, 80])  // fixed Apple-Health-style range
    .range([height, 0]);

  //------------------------------------------------------------
  // GRIDLINES (Apple style)
  const xGrid = d3.axisBottom(x)
    .ticks(6)
    .tickSize(-height)
    .tickFormat("");

  const yGrid = d3.axisLeft(y)
    .ticks(6)
    .tickSize(-width)
    .tickFormat("");

  g.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(xGrid)
    .selectAll("line")
    .attr("stroke", "#e9edf5");

  g.append("g")
    .attr("class", "grid")
    .call(yGrid)
    .selectAll("line")
    .attr("stroke", "#e9edf5");

  //------------------------------------------------------------
  // AXES
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %d")));

  g.append("g").call(d3.axisLeft(y));

  //------------------------------------------------------------
  // TITLE
  g.append("text")
    .attr("x", width / 2)
    .attr("y", -35)
    .attr("text-anchor", "middle")
    .style("font-size", "24px")
    .style("font-weight", "600")
    .text(`Resting Heart Rate — ${month.label}`);

  //------------------------------------------------------------
  // MONTHLY AVG LABEL
  g.append("text")
    .attr("x", width / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "500")
    .text(`Monthly Average   ${Math.round(monthlyAvg)} bpm`);

  //------------------------------------------------------------
  // HEALTHY ZONE SHADED BAND (Apple-style)
  g.append("rect")
    .attr("x", 0)
    .attr("width", width)
    .attr("y", y(65))
    .attr("height", Math.abs(y(55) - y(65)))
    .attr("fill", "#eaf4fe")
    .attr("opacity", 0.55);

  //------------------------------------------------------------
  // DOTS (soft blue, Apple style)
  g.selectAll("circle")
    .data(monthData)
    .join("circle")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.value))
    .attr("r", 5)
    .attr("fill", "#4a90e2")
    .attr("opacity", 0.7);

  //------------------------------------------------------------
  // TREND LINES (smoothed)
  const smooth = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => x(d.date))
    .y(d => y(d.value));

  // 30-day bold red trend
  g.append("path")
    .datum(ma30)
    .attr("fill", "none")
    .attr("stroke", "#d62839")
    .attr("stroke-width", 3);

  // 7-day blue trend
  g.append("path")
    .datum(ma7)
    .attr("fill", "none")
    .attr("stroke", "#0080ff")
    .attr("stroke-width", 3)
    .attr("opacity", 0.9);

  //------------------------------------------------------------
  // MONTHLY AVERAGE LINE (thin, blue)
  g.append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", y(monthlyAvg))
    .attr("y2", y(monthlyAvg))
    .attr("stroke", "#1f75d9")
    .attr("stroke-dasharray", "4 4")
    .attr("stroke-width", 2);

  g.append("text")
    .attr("x", width - 10)
    .attr("y", y(monthlyAvg) - 8)
    .attr("text-anchor", "end")
    .style("font-size", "13px")
    .style("fill", "#1f75d9")
    .text("Monthly Avg");
};
