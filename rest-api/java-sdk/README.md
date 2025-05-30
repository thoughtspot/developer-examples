# Java SDK Example

This repository provides a simple example of how to use the ThoughtSpot REST API SDK for Java. This example demonstrates usage of the SDK for authentication and API interactions.

## File Structure
rest-api/java-sdk/
│── src/
│   ├── main/
│   │   ├── java/        # Java source files
│   │   └── resources/   # Configuration files
│   └── test/           # Test files
│── build.gradle        # Gradle build configuration
│── gradlew            # Gradle wrapper script
│── settings.gradle    # Gradle settings

## Documentation and Resources

- [ThoughtSpot REST API SDK Documentation](https://developers.thoughtspot.com/docs/rest-api-sdk)
- [Maven Central Repository](https://central.sonatype.com/artifact/io.github.thoughtspot/rest-api-sdk-lib)

## Run locally

```bash
# Clone the repository
$ git clone https://github.com/thoughtspot/developer-examples
$ cd rest-api/java-sdk

# Build the project
$ ./gradlew build

# Run the application
$ java -cp build/classes/java/main org.example.Main 
```

## Dependencies

- Java 8 or higher
- Lombok (for reducing boilerplate code)
- Gson (for JSON handling)

## Technology Stack

- Java
- Gradle
- ThoughtSpot REST API SDK