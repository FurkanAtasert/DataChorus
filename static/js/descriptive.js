let excelData;
let columnDataArray;

document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.readAsBinaryString(file);

      reader.onload = function () {
        const data = reader.result;
        const workbook = XLSX.read(data, { type: "binary" });

        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];

        excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const variableList = document.getElementById("variableList");
        variableList.innerHTML = "";

        const headers = excelData[0];
        headers.forEach((header, index) => {
          const listItem = document.createElement("li");

          const button = document.createElement("button");
          button.textContent = header;
          button.classList.add("btn", "m-1");

          const select = document.createElement("select");
          select.id = `select-${header}`;
          const option1 = document.createElement("option");
          option1.value = "numeric";
          option1.text = "Numeric";
          select.appendChild(option1);
          const option2 = document.createElement("option");
          option2.value = "categorical";
          option2.text = "Categorical";
          select.appendChild(option2);

          button.addEventListener("click", function () {
            this.classList.toggle("btn-color-");
            this.classList.toggle("btn-warning");

            const columnIndex = index;
            const columnData = excelData
              .map((row) => row[columnIndex])
              .slice(1);
            const columnDataArray = Array(columnData);
            createQQPlot(columnDataArray, header);
            console.log("Data Controller:", columnDataArray);
          });

          listItem.appendChild(button);
          listItem.appendChild(select);
          variableList.appendChild(listItem);
        });

        const excelTable = document.getElementById("excelTable");
        excelTable.innerHTML = "";

        const table = document.createElement("table");
        table.classList.add("table");

        const thead = document.createElement("thead");
        const headerRowEl = document.createElement("tr");
        headers.forEach((header) => {
          const th = document.createElement("th");
          th.textContent = header;
          headerRowEl.appendChild(th);
        });
        thead.appendChild(headerRowEl);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        for (let i = 1; i < excelData.length; i++) {
          const rowData = excelData[i];
          const row = document.createElement("tr");
          for (let j = 0; j < rowData.length; j++) {
            const cellValue = rowData[j];
            const td = document.createElement("td");

            if (typeof cellValue === "number") {
              const fixedValue = cellValue.toFixed(4);
              td.textContent = fixedValue.replace(/\.?0+$/, ""); // Remove trailing zeros
            } else {
              td.textContent = cellValue;
            }

            row.appendChild(td);
          }
          tbody.appendChild(row);
        }
        table.appendChild(tbody);

        excelTable.appendChild(table);
      };
    }
    document.getElementById("analysisButton").style.display = "block";
    document.getElementById("outputArea").innerHTML = "";
    document.getElementById("histogram").innerHTML = "";
    document.getElementById("qqPlot").innerHTML = "";
    document.getElementById("pie").innerHTML = "";
  });



document
  .getElementById("analysisButton")
  .addEventListener("click", function () {
    const selectedVariableButtons = document.querySelectorAll(
      "#variableList .btn-warning"
    );
    const results = "";
    const selectedVariables = Array.from(selectedVariableButtons).map(
      (button) => button.textContent
    );

    fetch("/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: excelData,
        variableList: selectedVariables,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Request failed: ${response.status} ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((results) => {
        const outputArea = document.getElementById("outputArea");
        outputArea.innerHTML = "";

        const numericResults = {};
        const categoricalResults = {};

        for (const variable in results) {
          if (results[variable]["Analysis Type"] === "categorical") {
            categoricalResults[variable] = results[variable];
            console.log(
              "Kategorik Veri : ",
              results[variable],
              "Type'ı: ",
              typeof results[variable]
            );
          } else if (results[variable]["Analysis Type"] === "numeric") {
            numericResults[variable] = results[variable];
            console.log(
              "Sayısal Veri : ",
              results[variable],
              "Type'ı: ",
              typeof results[variable]
            );
          }
        }

        if (Object.keys(numericResults).length > 0) {
          const numericTableDiv = document.createElement("div");
          numericTableDiv.classList.add("result-table");
          numericTableDiv.id = "numericTable";
          outputArea.appendChild(numericTableDiv);
          createNumericTable(numericResults, numericTableDiv);
        }

        if (Object.keys(categoricalResults).length > 0) {
          const categoricalTableDiv = document.createElement("div");
          categoricalTableDiv.classList.add("result-table");
          categoricalTableDiv.id = "categoricalTable";
          outputArea.appendChild(categoricalTableDiv);
          createCategoricalTable(categoricalResults, categoricalTableDiv);
        }

        // Grafikleri oluştur
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  });

function createNumericTable(results, numericOutputArea) {
  const table = document.createElement("table");
  table.classList.add("table");

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const headers = [
    "Variable",
    "Mean",
    "Std. Dev.",
    "Variance",
    "Mode",
    "Median",
    "Min",
    "Max",
    "Q1",
    "Q3",
    "Shapiro Stat",
    "Shapiro P",
    "Shapiro Normal",
    "K-S Stat",
    "K-S P",
    "K-S Normal",
    "Sum of Squares",
    "Skewness",
    "Skewness Shape",
    "Excess Kurtosis",
    "Kurtosis Shape",
    "Outliers",
  ];

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (const variable in results) {
    const row = document.createElement("tr");
    const stats = results[variable];

    const variableCell = document.createElement("td");
    variableCell.textContent = variable;
    row.appendChild(variableCell);

    headers.slice(1).forEach((header) => {
      const td = document.createElement("td");
      const value = stats.hasOwnProperty(header) ? stats[header] : "";
      td.textContent = Number.isInteger(value)
        ? value.toString()
        : Number(value)
        ? value.toFixed(4).replace(/\.?0+$/, "")
        : value;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  numericOutputArea.innerHTML = "";
  numericOutputArea.appendChild(table);
  createHistogram(results);
  createQQPlot(results);
}

function createCategoricalTable(results, categoricalOutputArea) {
  const table = document.createElement("table");
  table.classList.add("table");

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const headers = [
    "Variable",
    "Group Name",
    "Frequency",
    "%",
    "Total Observations",
  ];

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (const variable in results) {
    const variableResult = results[variable];
    const groupName = variableResult["Group Name"];
    const frequency = variableResult["Frequency"];
    const totalObservations = variableResult["Total Observations"];
    const freqOverTotal = variableResult["Frequency/Total Observations"];

    for (let i = 0; i < groupName.length; i++) {
      const row = document.createElement("tr");

      if (i === 0) {
        const tdVariable = document.createElement("td");
        tdVariable.rowSpan = groupName.length;
        tdVariable.textContent = variable;
        row.appendChild(tdVariable);
      }

      const tdGroupName = document.createElement("td");
      tdGroupName.textContent = groupName[i];
      row.appendChild(tdGroupName);

      const tdFrequency = document.createElement("td");
      tdFrequency.textContent = frequency[i];
      row.appendChild(tdFrequency);

      const tdFrequencyRatio = document.createElement("td");
      tdFrequencyRatio.textContent = "%" + freqOverTotal[i].toFixed(2);
      row.appendChild(tdFrequencyRatio);

      if (i === 0) {
        const tdTotalObservations = document.createElement("td");
        tdTotalObservations.rowSpan = groupName.length;
        tdTotalObservations.textContent = totalObservations;
        row.appendChild(tdTotalObservations);
      }

      tbody.appendChild(row);
    }
  }

  table.appendChild(tbody);
  categoricalOutputArea.appendChild(table);
  createPieChart(results);
}

function createCharts(results) {
  const numericResults = {};
  const categoricalResults = {};
  for (const variable in results) {
    if (results[variable]["Analysis Type"] === "categorical") {
      categoricalResults[variable] = results[variable];
    } else if (results[variable]["Analysis Type"] === "numeric") {
      numericResults[variable] = results[variable];
    }
  }

  createHistogram(numericResults);
  createQQPlot(numericResults);
  createPieChart(categoricalResults);
  
}

function createHistogram(numericResults) {
  const canvas = document.createElement("canvas");
  document.getElementById("histogram").appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const labels = Object.keys(numericResults);

  const statisticalValues = [
    "Std. Dev.",
    "Variance",
    "Mean",
    "Mode",
    "Median",
    "Min",
    "Max",
    "Q1",
    "Q3",
    "Sum of Squares",
  ];

  const datasets = statisticalValues.map((statisticalValue) => {
    const statisticalData = labels.map(
      (key) => numericResults[key][statisticalValue]
    );
    return {
      label: statisticalValue,
      data: statisticalData,
      backgroundColor: labels.map(
        () => "#" + Math.floor(Math.random() * 16777215).toString(16)
      ),
    };
  });

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      scales: {
        x: {
          beginAtZero: true,
        },
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        datalabels: {
          formatter: (value, context) => {
            return context.dataset.label + ": " + value;
          },
          color: '#000',
          align: 'center',
          anchor: 'end',
          offset: -10,
          display: true,
        }
      },
    },
  });
}


function createQQPlot(columnDataArray, header) {
  const canvas = document.createElement("canvas");
  document.getElementById("qqPlot").appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let data = columnDataArray[0];
  if (Array.isArray(data)) {
    data = data.map(Number).sort((a, b) => a - b);
  } else {
    console.log("Invalid columnDataArray format");
    return;
  }

  // Ölçeklendirme adımları
  const min = Math.min(...data);
  const max = Math.max(...data);
  const targetMin = 0;
  const targetMax = 1;
  const scaledData = data.map((value) => {
    const scaledValue =
      ((value - min) / (max - min)) * (targetMax - targetMin) + targetMin;
    return scaledValue;
  });

  // QQ Plot verileri
  const qqData = scaledData.map((value, index) => ({ x: index, y: value }));

  // Normalite çizgisi bitiş noktalarını hesapla
  const lineData = [
    { x: 0, y: 0 },
    { x: scaledData.length - 1, y: 1 },
  ];

  const chart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: header,
          data: qqData,
          backgroundColor:
            "#" + Math.floor(Math.random() * 16777215).toString(16),
        },
        {
          type: "line",
          label: "Normality Line",
          data: lineData,
          borderColor: "red",
          borderWidth: 3,
          fill: false,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function createPieChart(categoricalResults) {
  for (let key in categoricalResults) {
    const canvas = document.createElement("canvas");
    document.getElementById("pie").appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const labels = categoricalResults[key]["Group Name"];
    const data = categoricalResults[key]["Frequency"];

    const chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: labels.map(
              () => "#" + Math.floor(Math.random() * 16777215).toString(16)
            ),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          datalabels: {
            formatter: (value, context) => {
              return context.chart.data.labels[context.dataIndex] + ": " + value;
            },
            color: '#000',
            align: 'center',
            dsiplay: true,
          }
        }
      },
    });
  }
}