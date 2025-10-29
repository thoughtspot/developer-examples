# OpenAI Python API Example

This example demonstrates how to use the OpenAI Python library to make API calls to the chat completions endpoint.

## Prerequisites

- Python 3.7 or higher
- An OpenAI API key

## Setup

1. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file from the template:
   ```bash
   cp env.template .env
   ```

3. Add your OpenAI API key to the `.env` file:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

## Usage

Run the example script:

```bash
python main.py
```

The script will:
1. Load your API key from the `.env` file
2. Initialize the OpenAI client
3. Send a "hello" message to the chat completions API
4. Display the response along with token usage information

## Example Output

```
Sending message to OpenAI API...

==================================================
Response from OpenAI:
==================================================

Model: gpt-3.5-turbo-0125
Message: Hello! How can I assist you today?

Tokens used: 26
  - Prompt tokens: 8
  - Completion tokens: 9
==================================================
```

## Code Structure

- `main.py`: Main script demonstrating the API usage
- `requirements.txt`: Python dependencies
- `env.template`: Template for environment variables
- `.env`: Your local environment variables (not tracked in git)

## API Reference

This example uses the [OpenAI Python library](https://github.com/openai/openai-python) to interact with the Chat Completions API.

### Key Components

- **Client Initialization**: Creates an OpenAI client with your API key
- **Chat Completions**: Sends messages and receives AI-generated responses
- **Response Handling**: Extracts and displays the response content and metadata

## Customization

You can modify the example to:
- Use different models (e.g., `gpt-4`, `gpt-4-turbo`)
- Send different messages
- Add system prompts for specific behaviors
- Adjust parameters like temperature, max_tokens, etc.

Example with additional parameters:

```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "hello"}
    ],
    temperature=0.7,
    max_tokens=150
)
```

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [OpenAI Python Library](https://github.com/openai/openai-python)
- [Chat Completions Guide](https://platform.openai.com/docs/guides/chat-completions)

