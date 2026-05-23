package com.tetramobile.tetra.settings;

import com.tetramobile.tetra.settings.dto.ReplaceSystemSettingsRequest;
import com.tetramobile.tetra.settings.dto.SystemSettingsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SystemSettingsServiceImpl implements SystemSettingsService {

    private final SystemSettingsRepository repository;

    @Override
    @Transactional(readOnly = true)
    public SystemSettingsResponse getSettings() {
        return toResponse(load());
    }

    @Override
    @Transactional
    public SystemSettingsResponse replaceSettings(ReplaceSystemSettingsRequest request) {
        SystemSettings settings = load();
        settings.setBankAccountHolder(request.bankAccountHolder());
        settings.setBankIban(request.bankIban());
        settings.setBankSwift(request.bankSwift());
        settings.setCompanyName(request.companyName());
        settings.setCompanyAddress(request.companyAddress());
        return toResponse(repository.save(settings));
    }

    @Override
    @Transactional(readOnly = true)
    public SystemSettings load() {
        return repository.findById(SystemSettings.SINGLETON_ID)
                .orElseGet(() -> {
                    SystemSettings s = new SystemSettings();
                    s.setId(SystemSettings.SINGLETON_ID);
                    return repository.save(s);
                });
    }

    private SystemSettingsResponse toResponse(SystemSettings s) {
        return new SystemSettingsResponse(
                s.getBankAccountHolder(),
                s.getBankIban(),
                s.getBankSwift(),
                s.getCompanyName(),
                s.getCompanyAddress()
        );
    }
}
