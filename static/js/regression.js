let excelData;

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

        const variableList = document.getElementById("dependent-var");
        variableList.innerHTML = "";

        const headers = excelData[0];
        headers.forEach((header, index) => {
          const option = document.createElement("option");
          option.value = header;
          option.text = header;
          variableList.appendChild(option);
        });

        const independentVarList = document.getElementById("independent-vars");
        independentVarList.innerHTML = "";

        headers.forEach((header, index) => {
          if (index !== 0) {
            const option = document.createElement("option");
            option.value = header;
            option.text = header;
            independentVarList.appendChild(option);
          }
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
    
  });

document
  .getElementById("performRegression")
  .addEventListener("click", function () {
    const dependentVar = document.getElementById("dependent-var").value;
    const independentVars = Array.from(
      document.querySelectorAll("#independent-vars option:checked")
    ).map((option) => option.value);

    const jsonData = {
      dependent_var: dependentVar,
      independent_vars: independentVars,
      data: excelData,
    };

    fetch("/perform_regression", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Request failed: ${response.status} ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((result) => {
        // Process the regression results
        const regressionResult = result.regression_result;

        // Display or process the results
        console.log(regressionResult);

        // Example: Display the results in the outputAreaRegression
        const outputAreaRegression = document.getElementById(
          "outputAreaRegression"
        );
        outputAreaRegression.innerHTML = "";

        const resultTable = document.createElement("table");
        resultTable.classList.add("table");

        const thead = document.createElement("thead");
        const headerRowEl = document.createElement("tr");
        const header1 = document.createElement("th");
        header1.textContent = "Analysis";
        headerRowEl.appendChild(header1);
        const header2 = document.createElement("th");
        header2.textContent = "Value";
        headerRowEl.appendChild(header2);
        thead.appendChild(headerRowEl);
        resultTable.appendChild(thead);

        const tbody = document.createElement("tbody");
        for (const key in regressionResult) {
          const row = document.createElement("tr");
          const analysisCell = document.createElement("td");
          analysisCell.textContent = key;
          const valueCell = document.createElement("td");
          valueCell.textContent = regressionResult[key];
          row.appendChild(analysisCell);
          row.appendChild(valueCell);
          tbody.appendChild(row);
        }
        resultTable.appendChild(tbody);

        outputAreaRegression.appendChild(resultTable);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
      let scatterPlotHtml = "{{ result.regression_result.Scatter_plot|safe }}";
      let residualPlotHtml = "{{ result.regression_result.Residual_plot|safe }}";

      document.getElementById('outputAreaRegression').innerHTML = scatterPlotHtml + residualPlotHtml;
  });

  
function getDataType(columnData) {
  const uniqueValues = new Set(columnData);

  // Check if all values are numbers
  const isNumeric = columnData.every((value) => typeof value === "number");

  // Check if all values are strings
  const isString = columnData.every((value) => typeof value === "string");

  if (isNumeric) {
    return "numeric";
  } else if (isString) {
    return "categorical";
  } else {
    return "unknown";
  }
}
