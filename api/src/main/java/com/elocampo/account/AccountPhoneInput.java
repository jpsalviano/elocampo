package com.elocampo.account;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AccountPhoneInput {

    @NotNull(message = "countryCode is required")
    private Integer countryCode;

    @NotNull(message = "stateCode")
    private Integer stateCode;

    @NotNull(message = "number")
    @jakarta.validation.constraints.Size(max = 100, message = "number is too long")
    private String number;
}
