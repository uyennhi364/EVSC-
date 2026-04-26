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
            ?? throw new AppException("Không tìm thấy loại sạc.", 404);

        return MapDetail(chargeType);
    }

    public async Task<ChargeTypeDetailDto> CreateAsync(CreateChargeTypeRequest request, CancellationToken cancellationToken)
    {
        ValidationGuard.AgainstNullOrWhiteSpace(request.Code, "Mã loại sạc không được để trống.");
        ValidationGuard.AgainstNullOrWhiteSpace(request.Name, "Tên loại sạc không được để trống.");
        ValidationGuard.Against(request.MaxVoltage <= 0, "Điện áp tối đa phải lớn hơn 0.");
        ValidationGuard.Against(request.MaxCurrent <= 0, "Dòng điện tối đa phải lớn hơn 0.");

        var existedCode = await _chargeTypeRepository.ExistsByCodeAsync(request.Code.Trim(), null, cancellationToken);
        ValidationGuard.Against(existedCode, "Mã loại sạc đã tồn tại.");

        var existedName = await _chargeTypeRepository.ExistsByNameAsync(request.Name.Trim(), null, cancellationToken);
        ValidationGuard.Against(existedName, "Tên loại sạc đã tồn tại.");

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
            ?? throw new AppException("Không tìm thấy loại sạc.", 404);

        ValidationGuard.AgainstNullOrWhiteSpace(request.Name, "Tên loại sạc không được để trống.");
        ValidationGuard.Against(request.MaxVoltage <= 0, "Điện áp tối đa phải lớn hơn 0.");
        ValidationGuard.Against(request.MaxCurrent <= 0, "Dòng điện tối đa phải lớn hơn 0.");

        var existedName = await _chargeTypeRepository.ExistsByNameAsync(request.Name.Trim(), id, cancellationToken);
        ValidationGuard.Against(existedName, "Tên loại sạc đã tồn tại.");

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
            ?? throw new AppException("Không tìm thấy loại sạc.", 404);

        var isInUse = await _chargeTypeRepository.IsInUseAsync(id, cancellationToken);
        ValidationGuard.Against(isInUse, "Không thể xóa loại sạc đang được sử dụng.");

        _chargeTypeRepository.Remove(chargeType);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static ChargeTypeSummaryDto MapSummary(ChargeType chargeType)
        => new(
            chargeType.Id,
            chargeType.Code,
            chargeType.Name,
            chargeType.MaxVoltage,
            chargeType.MaxCurrent,
            chargeType.SuitableCar,
            chargeType.Status,
            chargeType.CreatedAt);

    private static ChargeTypeDetailDto MapDetail(ChargeType chargeType)
        => new(
            chargeType.Id,
            chargeType.Code,
            chargeType.Name,
            chargeType.MaxVoltage,
            chargeType.MaxCurrent,
            chargeType.SuitableCar,
            chargeType.Status,
            chargeType.CreatedAt,
            chargeType.UpdatedAt);
}
