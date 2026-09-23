# Holtrop & Mennen (1982) Method

## Overview

The Holtrop & Mennen (1982) method is the most widely used approximate power prediction method in conceptual ship design. It uses regression analysis of model test data from the MARIN database to predict total resistance and required power.

## Methodology

### 1. Frictional Resistance (Rf)

Calculated using the ITTC 1957 model-ship correlation line:

$$C_F = \frac{0.075}{(\log_{10} R_n - 2)^2}$$

$$R_F = \frac{1}{2} \rho V_s^2 S C_F$$

Where:
- $R_n = \frac{V_s L_{WL}}{\nu}$ (Reynolds number)
- $S$ = wetted surface area [m²]
- $\rho$ = water density [kg/m³]
- $V_s$ = ship speed [m/s]

### 2. Wetted Surface (S)

$$S = L_{WL}(2T + B)\sqrt{C_M}\left(0.453 + 0.4425 C_B - 0.2862 C_M - 0.003467\frac{B}{T} + 0.3696 C_{WP}\right) + 2.38\frac{C_B}{C_P}$$

### 3. Wave Resistance (R_W)

Based on Grim's modified wave resistance formula:

$$R_W = \frac{1}{2}\rho V_s^2 S \cdot c_1 c_2 c_3 c_4 c_5 c_6 \cdot \exp\left(-0.9 F_n^{-0.9} - 0.2 e^{-1.5 F_n^{-0.7}}\right)$$

Where the coefficients are:
- $c_1 = 2223105 C_B^{3.7861} (T/B)^{1.0796} (90 - \arctan(2(L/B - 1)))^{-1.0796}$
- $c_2, c_3, c_4, c_5, c_6$ are correction factors for LCB, Fn, and hull form

### 4. Viscous Resistance (R_V)

$$R_V = k_1 R_F$$

Where $k_1$ is the form factor:

$$k_1 = 0.0947 C_B^{1.281} (T/B)^{0.444}$$

### 5. Additional Resistance (R_A)

$$R_A = \frac{1}{2}\rho V_s^2 S \cdot C_{AA} \cdot 10^{-3}$$

### 6. Appendage Resistance (R_{APP})

$$R_{APP} = \frac{1}{2}\rho V_s^2 S \cdot k_2 \cdot C_F \cdot 10^{-2}$$

### Total Resistance

$$R_T = R_F + R_W + R_V + R_A + R_{APP} + R_{W,add}$$

## Propulsion Efficiencies

### Hull Efficiency (η_H)

$$\eta_H = \frac{1 - t}{1 - w}$$

Where:
- $w$ = wake fraction (Taylor approximation)
- $t$ = thrust deduction fraction

### Propeller Open-Water Efficiency (η_O)

Simplified B-series approximation based on P/D and Ae/Ao.

### Delivered Efficiency (η_D)

$$\eta_D = \eta_H \cdot \eta_O \cdot \eta_R \cdot \eta_B$$

## Power Calculations

- **Effective Power**: $P_E = R_T \cdot V_s$
- **Delivered Power**: $P_D = P_E / \eta_D$
- **Shaft Horsepower**: $SHP = P_D / 745.7$

## Applicability Range

| Parameter | Range |
|-----------|-------|
| Froude number | 0.15 – 0.45 |
| Prismatic coefficient | 0.55 – 0.85 |
| LCB | -5% to +5% LWL |
| B/T | 2.0 – 4.0 |
| L/B | 5.0 – 8.0 |

## Accuracy

±5-10% for displacement ships within the validity range.

## References

1. Holtrop, J., & Mennen, G. G. J. (1982). "An approximate power prediction method." *International Shipbuilding Progress*, 29(335).
2. Holtrop, J. (2001). "Ship design: resistance and propulsion." Delft University of Technology.
