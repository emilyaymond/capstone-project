
import './Dashboard.css';

const Dashboard = () => {
  const heartRateVisualization = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Heart Rate Visualization</title>
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <style>
        body { 
          font-family: sans-serif; 
          margin: 40px; 
        }
        .tooltip {
          position: absolute;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #ccc;
          padding: 8px;
          border-radius: 4px;
          pointer-events: none;
          font-size: 13px;
          color: #333;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          opacity: 0;
          transition: opacity 0.15s ease-in-out;
        }
        input[type="range"] {
          width: 60%;
        }
      </style>
    </head>
    <body>
      <h2>Heart Rate Viewer</h2>
      <p>Upload a CSV with columns: <code>startDate,value</code> or <code>datetime,heart_rate</code></p>
      <input type="file" id="fileInput" accept=".csv" />
      <br><br>
      <svg id="chart"></svg>
      <div style="margin-top: 1em;">
        <input type="range" id="weekRange" min="0" step="1" value="0" disabled />
        <p id="weekLabel">Upload a CSV to begin</p>
      </div>
      
      <script>
        function movingAverage(data, windowSize = 40) {
          return data.map((d, i) => {
            const start = Math.max(0, i - windowSize);
            const subset = data.slice(start, i + 1);
            return {
              datetime: d.datetime,
              heart_rate: d3.mean(subset, x => x.heart_rate)
            };
          });
        }

        const fileInput = document.getElementById("fileInput");
        const slider = document.getElementById("weekRange");
        const weekLabel = document.getElementById("weekLabel");
        const margin = { top: 60, right: 40, bottom: 60, left: 60 };
        const width = 1000 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
        const svg = d3.select("#chart")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom);
        const g = svg.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        const x = d3.scaleTime().range([0, width]);
        const y = d3.scaleLinear().range([height, 0]);
        const xAxis = g.append("g").attr("transform", "translate(0," + height + ")");
        const yAxis = g.append("g");

        g.append("text")
          .attr("x", width/2)
          .attr("y", -22)
          .attr("text-anchor", "middle")
          .style("font-size", "20px")
          .style("font-weight", "bold")
          .text("Heart Rate (Weekly)");
        g.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", -45)
          .attr("x", -height/2)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .text("Heart Rate (bpm)");

        const rawLine = d3.line()
          .x(d => x(d.datetime))
          .y(d => y(d.heart_rate));
        const smoothLine = d3.line()
          .curve(d3.curveMonotoneX)
          .x(d => x(d.datetime))
          .y(d => y(d.heart_rate));
        const rawPath = g.append("path")
          .attr("fill", "none")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "4 4");
        const smoothPath = g.append("path")
          .attr("fill", "none")
          .attr("stroke", "#e63946")
          .attr("stroke-width", 3);
        const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip");

        function update(weeks, index) {
          const week = weeks[index];
          weekLabel.textContent = week.weekStart.toDateString();
          const data = week.records;
          const smoothed = movingAverage(data, 40);
          x.domain(d3.extent(data, d => d.datetime));
          y.domain([
            d3.min(data, d => d.heart_rate) - 10,
            d3.max(data, d => d.heart_rate) + 10
          ]);
          xAxis.call(d3.axisBottom(x));
          yAxis.call(d3.axisLeft(y));
          rawPath.datum(data).attr("d", rawLine);
          smoothPath.datum(smoothed).attr("d", smoothLine);
          g.selectAll("circle")
            .data(data)
            .join("circle")
            .attr("cx", d => x(d.datetime))
            .attr("cy", d => y(d.heart_rate))
            .attr("r", 3)
            .attr("fill", "#e63946")
            .on("mouseenter", (event, d) => {
              tooltip.style("opacity", 1)
                .html("<strong>" + d.datetime.toLocaleString() + "</strong><br>" + d.heart_rate.toFixed(1) + " bpm")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 28 + "px");
            })
            .on("mouseleave", () => tooltip.style("opacity", 0));
        }

        fileInput.addEventListener("change", (event) => {
          const file = event.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = e => {
            const text = e.target.result;
            const raw = d3.csvParse(text).map(d => {
              let datetime, heart_rate;
              if (d.startDate && d.value) {
                datetime = new Date(d.startDate);
                heart_rate = +d.value;
              } else if (d.datetime && d.heart_rate) {
                datetime = new Date(d.datetime);
                heart_rate = +d.heart_rate;
              }
              return { datetime, heart_rate };
            });
            const cleanData = raw.filter(d => !isNaN(d.datetime) && !isNaN(d.heart_rate));
            cleanData.sort((a, b) => a.datetime - b.datetime);

            function getWeekStart(d) {
              let s = new Date(d);
              s.setHours(0,0,0,0);
              s.setDate(s.getDate() - s.getDay());
              return s;
            }
            const weeks = d3.groups(cleanData, d => +getWeekStart(d.datetime))
              .map(([weekStart, records]) => ({
                weekStart: new Date(+weekStart),
                records
              }));
            slider.max = weeks.length - 1;
            slider.disabled = false;
            update(weeks, 0);
            slider.addEventListener("input", e => update(weeks, +e.target.value));
          };
          reader.readAsText(file);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <div className="dashboard">
      <h2>Health Data Dashboard</h2>
      <div 
        className="visualization-container"
        role="region"
        aria-labelledby="viz-heading"
        aria-describedby="viz-description"
      >
        <h3 id="viz-heading">Heart Rate Visualization</h3>
        <p id="viz-description">
          Interactive heart rate chart with CSV upload functionality. 
          Upload your heart rate data to visualize trends over time with weekly navigation.
        </p>
        <iframe
          title="Heart Rate Visualization"
          srcDoc={heartRateVisualization}
          style={{
            width: "100%",
            height: "700px",
            border: "1px solid #ddd",
            borderRadius: "8px"
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;