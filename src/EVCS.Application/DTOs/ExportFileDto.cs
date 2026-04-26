namespace EVCS.Application.DTOs;

public record ExportFileDto(string FileName, string ContentType, byte[] Content);
