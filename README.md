## Prerequisites

- Python 3.x installed on your system
- pip (Python package installer)

## Setting Up Virtual Environment

1. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

3. Your command prompt should now show `(venv)` at the beginning, indicating that the virtual environment is active.

## Installing Requirements

1. Ensure your virtual environment is activated (you should see `(venv)` in your terminal).

2. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

3. Install Playwright:
   ```bash
   playwright install
   ```

## Setting Up Environment Variables

Create a `.env` file in the root of your project and add the following lines:

```plaintext
GOOGLE_GENAI_USE_VERTEXAI="False"
GOOGLE_API_KEY=""
```

Make sure to replace `""` with your actual Google API key.

## Running the Project

To start the agent in the browser, run:
```bash
adk web
```

## Notes

- Always ensure your virtual environment is activated before running the project.
- If you add new dependencies, update the `requirements.txt` file using:
  ```bash
  pip freeze > requirements.txt
  ```