package com.elocampo.auth.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Cadastro. Não há campo de admin, de propósito: admins só existem pela carga
// da demonstração (ou pelo banco), nunca por esta rota pública. Campos
// desconhecidos, "isAdmin" inclusive, são ignorados.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserInput {

    @NotBlank(message = "email cannot be blank")
    @Email(message = "email is invalid")
    @Size(max = 70, message = "Email cannot be greater than 70 characters")
    private String email;

    // O bcrypt só lê os primeiros 72 bytes.
    @NotBlank(message = "password cannot be null or blank")
    @Size(min = 8, max = 72, message = "password must have between 8 and 72 characters")
    private String password;
}
