package com.elocampo.account;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountInput {


    @NotBlank(message = "name is required")
    @Size(max = 70, message = "name cannot be greater than 70 characters")
    private String name;

    @Size(max = 70, message = "businessName cannot be greater than 70 characters")
    private String businessName;

    @Size(max = 20, message = "cpf is too long")
    private String cpf;
    @Size(max = 20, message = "cnpj is too long")
    private String cnpj;

    @NotNull(message = "birthdayDate is required")
    private Long birthdayDate;

    @NotNull(message = "address is required")
    private @Valid AccountAddressInput address;

    @NotNull(message = "phone is required")
    private @Valid AccountPhoneInput phone;

    @NotNull(message = "role is required")
    private AccountRole role;
}
