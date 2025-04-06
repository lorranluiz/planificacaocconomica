package xyz.planecon.dto;

/**
 * DTO para padronização de respostas de erro da API
 */
public class ErrorResponse {
    private String message;
    private String details;
    private long timestamp;

    public ErrorResponse(String message, String details) {
        this.message = message;
        this.details = details;
        this.timestamp = System.currentTimeMillis();
    }

    // Getters
    public String getMessage() {
        return message;
    }

    public String getDetails() {
        return details;
    }

    public long getTimestamp() {
        return timestamp;
    }
}
