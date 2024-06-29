import seaborn as sns
import matplotlib.pyplot as plt
import mpld3
import io
import base64
import pandas as pd
import numpy as np
from scipy import stats
from collections import OrderedDict
from flask import Flask, request, jsonify, render_template
import statsmodels.api as sm
from sklearn.linear_model import LinearRegression, LogisticRegression
import json

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/analysis")
def analysis():
    return render_template("inner-page.html")

@app.route("/regression")
def regression():
    return render_template("regression.html")

@app.route('/analyze', methods=['POST'])
def analyze():
    request_data = request.get_json()

    # Excel data
    excel_data = request_data['data']
    df = pd.DataFrame(excel_data[1:], columns=excel_data[0])

    # Selected variables
    variable_list = request_data['variableList']

    results = {}
    for variable in variable_list:
        result = OrderedDict()

        if df[variable].dtype == object:
            # Categorical analysis
            value_counts = df[variable].value_counts()
            total_observations = df[variable].count()

            result['Variable'] = variable
            result['Group Name'] = value_counts.index.tolist()
            result['Frequency'] = value_counts.tolist()
            result['Frequency/Total Observations'] = ((value_counts / total_observations)*100).tolist()
            result['Total Observations'] = total_observations
            result['Analysis Type'] = 'categorical'

        else:
            # Numeric analysis
            df[variable] = pd.to_numeric(df[variable], errors='coerce')

            result['Mean'] = df[variable].mean()
            result['Std. Dev.'] = df[variable].std()
            result['Variance'] = df[variable].var()
            result['Mode'] = df[variable].mode()[0] if not df[variable].mode().empty else np.nan
            result['Median'] = df[variable].median()
            result['Min'] = df[variable].min()
            result['Max'] = df[variable].max()
            result['Q1'] = df[variable].quantile(0.25)
            result['Q3'] = df[variable].quantile(0.75)
            result['Shapiro Stat'], shapiro_p = stats.shapiro(df[variable].dropna())
            result['Shapiro P'] = shapiro_p
            result['Shapiro Normal'] = 'does not reject normality (normal)' if shapiro_p > 0.050 else 'rejects normality (not normal)'
            result['K-S Stat'], ks_p = stats.kstest(df[variable].dropna(), 'norm')
            result['K-S P'] = ks_p
            result['K-S Normal'] = 'does not reject normality (normal)' if ks_p > 0.050 else 'rejects normality (not normal)'
            result['Sum of Squares'] = np.sum(np.square(df[variable] - result['Mean']))

            # Excess Kurtosis
            result['Excess Kurtosis'] = stats.kurtosis(df[variable].dropna(), fisher=True)

            # Kurtosis Shape
            if result['Excess Kurtosis'] > 0:
                result['Kurtosis Shape'] = 'Positive Kurtosis (Leptokurtic)'
            elif result['Excess Kurtosis'] < 0:
                result['Kurtosis Shape'] = 'Negative Kurtosis (Platykurtic)'
            else:
                result['Kurtosis Shape'] = 'Mesokurtic'

            # Skewness
            result['Skewness'] = stats.skew(df[variable].dropna())
            if result['Skewness'] > 0:
                result['Skewness Shape'] = 'Positive Skewness (Right Skewed)'
            elif result['Skewness'] < 0:
                result['Skewness Shape'] = 'Negative Skewness (Left Skewed)'
            else:
                result['Skewness Shape'] = 'Symmetric Distribution'

            # Skewness and Kurtosis Test P-values
            _, result['Skew Test P-value'] = stats.skewtest(df[variable].dropna())
            _, result['Kurtosis Test P-value'] = stats.kurtosistest(df[variable].dropna())

            # Outliers
            lower_threshold = result['Q1'] - 1.5 * (result['Q3'] - result['Q1'])
            upper_threshold = result['Q3'] + 1.5 * (result['Q3'] - result['Q1'])
            outliers = df[(df[variable] < lower_threshold) | (df[variable] > upper_threshold)][variable]
            result['Outliers'] = outliers.tolist()

            result['Analysis Type'] = 'numeric'

        # Convert each result to Python's basic types
        for key in result:
            if isinstance(result[key], np.int64):
                result[key] = int(result[key])
            elif isinstance(result[key], np.float64):
                result[key] = float(result[key])

        results[variable] = result

        
    return jsonify(results)



@app.route('/perform_regression', methods=['POST'])
def perform_regression():
    data = request.get_json()

    dependent_var = data['dependent_var']
    independent_vars = data['independent_vars']
    excel_data = data['data']

    
    df = pd.DataFrame(excel_data[1:], columns=excel_data[0])

    selected_columns = [dependent_var] + independent_vars
    df_selected = df.loc[:, selected_columns]

    
    df_selected = df_selected.apply(pd.to_numeric, errors='coerce')

    df_selected = df_selected.dropna()

    
    y = df_selected[dependent_var]
    X = df_selected.loc[:, independent_vars]

    
    dependent_var_type = df_selected[dependent_var].dtype
    if dependent_var_type == 'object':
        model = LogisticRegression()
        model.fit(X, y)
        result_type = 'Logistical Regression'
    elif dependent_var_type != 'object':
        model = LinearRegression()
        model.fit(X, y)
        result_type = 'Linear Regression'
    else:
        return jsonify({'error': 'Invalid dependent variable type'})

    coefficients = model.coef_
    intercept = model.intercept_

    
    y_pred = model.predict(X)

    
    r_squared = model.score(X, y)

    
    residuals = y - y_pred

    
    n = len(y)
    p = len(coefficients)
    mse = np.sum(residuals**2) / (n - p - 1)
    standard_errors = np.sqrt(np.diagonal(np.linalg.inv(X.T @ X) * mse))

    t_scores = coefficients / standard_errors
    p_values = 2 * (1 - stats.t.cdf(np.abs(t_scores), n - p - 1))

    
    correlations = df_selected.corr()

    
    result = {
        'regression_result': {
            'Coefficients': list(coefficients),
            'Intercept': intercept,
            'R Squared': r_squared,
            'Standard Error': list(standard_errors),
            'F Test P Value': list(p_values),
            'Result type': result_type,
        },
    }

    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True)