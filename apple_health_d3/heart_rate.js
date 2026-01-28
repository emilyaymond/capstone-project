//------------------------------------------------------------
// HELPER: moving average for smoothing
function movingAverageHR(data, window = 15) {
  return data.map((d, i) => ({
    date: d.date,
    value: d3.mean(data.slice(Math.max(0, i - window), i + 1), x => x.value)
  }));
}

//------------------------------------------------------------
// LOAD RAW HR DATA
d3.csv("data/HeartRate.csv").then(raw => {

  const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");

  raw.forEach(d => {
    const cleaned = d.startDate.split(" ").slice(0, 2).join(" ");
    d.date = parseDate(cleaned);
    d.value = +d.value;
  });

  raw = raw.filter(d => d.date && !isNaN(d.value));
  raw.sort((a, b) => a.date - b.date);

  //------------------------------------------------------------
  // GROUP ALL POINTS BY DATE
  const byDay = d3.groups(raw, d => d3.timeFormat("%Y-%m-%d")(d.date))
    .map(([dayString, records]) => ({
      dayString,
      day: new Date(dayString),
      records
    }));

  // Populate <select>
  const daySelect = document.getElementById("day-select");
  daySelect.innerHTML = byDay.map(d =>
    `<option value="${d.dayString}">${d.dayString}</option>`
  ).join("");

  //------------------------------------------------------------
  // DRAW FUNCTION (used by toggle.js)
  window.drawDailyHR = function(svg) {

    svg.selectAll("*").remove();
    document.getElementById("day-label").style.display = "inline";
    daySelect.style.display = "inline";

    const selected = daySelect.value || byDay[0].dayString;
    const { records } = byDay.find(d => d.dayString === selected);

    // X = time of day
    const x = d3.scaleTime()
      .domain([new Date(`${selected} 00:00`), new Date(`${selected} 23:59`)])
      .range([0, svg.node().clientWidth - 100]);

    // Y = HR values
    const y = d3.scaleLinear()
      .domain([d3.min(records, d => d.value) - 5, d3.max(records, d => d.value) + 5])
      .range([svg.node().clientHeight - 100, 0]);

    const margin = { top: 70, right: 40, bottom: 60, left: 60 };
    const width = svg.node().clientWidth - margin.left - margin.right;
    const height = svg.node().clientHeight - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(12).tickFormat(d3.timeFormat("%I:%M %p")));

    g.append("g").call(d3.axisLeft(y));

    // Title
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -25)
      .attr("text-anchor", "middle")
      .style("font-size", "22px")
      .style("font-weight", "bold")
      .text(`Heart Rate on ${selected}`);

    // Raw dots
    g.selectAll("circle.raw")
      .data(records)
      .join("circle")
      .attr("class", "raw")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.value))
      .attr("r", 3)
      .attr("fill", "#999");

    // Smoothed line
    const smoothed = movingAverageHR(records, 20);

    const smoothLine = d3.line()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.date))
      .y(d => y(d.value));

    g.append("path")
      .datum(smoothed)
      .attr("fill", "none")
      .attr("stroke", "#e63946")
      .attr("stroke-width", 3);
  };

  // When user changes the day → redraw
  daySelect.addEventListener("change", () => {
    const svg = d3.select("#chart");
    drawDailyHR(svg);
  });

  console.log("Hourly HR ready.");
});
