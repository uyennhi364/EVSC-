using EVCS.Application.Abstractions.Persistence;
using EVCS.Application.Abstractions.Services;
using EVCS.Application.Common;
using EVCS.Application.DTOs;
using EVCS.Domain.Entities;
using EVCS.Domain.Enums;

namespace EVCS.Application.Services;

public sealed class ChargeTypeService : IChargeTypeService
{
    private readonly IChargeTypeRepository _chargeTypeRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ChargeTypeService(IChargeTypeRepository chargeTypeRepository, IUnitOfWork unitOfWork)
    {
        _chargeTypeRepository = chargeTypeRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyCollection<ChargeTypeSummaryDto>> GetListAsync(ChargeTypeListQuery query, CancellationToken cancellationToken)
    {
        var chargeTypes = await _chargeTypeRepository.GetListAsync(query.Keyword, query.Status, cancellationToken);
        return chargeTypes.Select(MapSummary).ToArray();
    }

    public async Task<ChargeTypeDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var chargeType = await _chargeTypeRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new AppException("Charge type not found.", 404);
        return MapDetail(chargeType);
    }

    public async Task<ChargeTypeDetailDto> CreateAsync(CreateChargeTypeRequest request, CancellationToken cancellationToken)
    {
        ValidationGuard.AgainstNullOrWhiteSpace(request.Code, "Charge type code is required.");
        ValidationGuard.AgainstNullOrWhiteSpace(request.Name, "Charge type name is required.");
        ValidationGuard.Against(request.MaxVoltage <= 0, "Max voltage must be greater than 0.");
        ValidationGuard.Against(request.MaxCurrent <= 0, "Max current must be greater than 0.");

        var existedCode = await _chargeTypeRepository.ExistsByCodeAsync(request.Code.Trim(), null, cancellationToken);
        ValidationGuard.Against(existedCode, "Charge type code already exists.");

        var existedName = await _chargeTypeRepository.ExistsByNameAsync(request.Name.Trim(), null, cancellationToken);
        ValidationGuard.Against(existedName, "Charge type name already exists.");

        var chargeType = new ChargeType
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            MaxVoltage = request.MaxVoltage,
            MaxCurrent = request.MaxCurrent,
            SuitableCar = request.SuitableCar?.Trim(),
            Status = request.Status ?? EquipmentStatus.Available,
            CreatedAt = DateTime.UtcNow
        };

        await _chargeTypeRepository.AddAsync(chargeType, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapDetail(chargeType);
    }

    public async Task<ChargeTypeDetailDto> UpdateAsync(int id, UpdateChargeTypeRequest request, CancellationToken cancellationToken)
    {
        var chargeType = await _chargeTypeRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new AppException("Charge type not found.", 404);

        ValidationGuard.AgainstNullOrWhiteSpace(request.Name, "Charge type name is required.");
        ValidationGuard.Against(request.MaxVoltage <= 0, "Max voltage must be greater than 0.");
        ValidationGuard.Against(request.MaxCurrent <= 0, "Max current must be greater than 0.");

        var existedName = await _chargeTypeRepository.ExistsByNameAsync(request.Name.Trim(), id, cancellationToken);
        ValidationGuard.Against(existedName, "Charge type name already exists.");

        chargeType.Name = request.Name.Trim();
        chargeType.MaxVoltage = request.MaxVoltage;
        chargeType.MaxCurrent = request.MaxCurrent;
        chargeType.SuitableCar = request.SuitableCar?.Trim();
        chargeType.Status = request.Status;
        chargeType.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapDetail(chargeType);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var chargeType = await _chargeTypeRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new AppException("Charge type not found.", 404);

        var isInUse = await _chargeTypeRepository.IsInUseAsync(id, cancellationToken);
        ValidationGuard.Against(isInUse, "Cannot delete a charge type that is currently in use.");

        _chargeTypeRepository.Remove(chargeType);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static ChargeTypeSummaryDto MapSummary(ChargeType chargeType)
        => new(chargeType.Id, chargeType.Code, chargeType.Name,
               chargeType.MaxVoltage, chargeType.MaxCurrent,
               chargeType.SuitableCar, chargeType.Status, chargeType.CreatedAt);

    private static ChargeTypeDetailDto MapDetail(ChargeType chargeType)
        => new(chargeType.Id, chargeType.Code, chargeType.Name,
               chargeType.MaxVoltage, chargeType.MaxCurrent,
               chargeType.SuitableCar, chargeType.Status,
               chargeType.CreatedAt, chargeType.UpdatedAt);
}
