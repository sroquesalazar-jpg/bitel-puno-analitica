import pandas as pd

ruta = r"D:\datos-originales\Detalle.postpago.CD-DL - 30 Ago.xlsx"
tabla = pd.read_excel(ruta, sheet_name="ACTIV + CASH IN")
print("Filas duplicadas:", tabla.duplicated().sum())

columnas_personales = ["sub_id", "isdn", "id_type", "id_no",
                       "contract_no", "owner_code", "owner_name", "staff"]
tabla = tabla.drop(columns=columnas_personales)

columnas_utiles = ["year", "month", "date", "center", "channel_type",
                   "sub_type", "mnp", "customer_type", "quantity_sub",
                   "has_cash_in", "amount_add"]
tabla = tabla[columnas_utiles]

tabla["fecha"] = pd.to_datetime(dict(year=tabla["year"], month=tabla["month"],
                                     day=tabla["date"])).dt.strftime("%Y-%m-%d")
tabla = tabla.drop(columns=["year", "month", "date"])

tabla = tabla.rename(columns={"center": "centro", "channel_type": "canal",
                              "sub_type": "tipo_linea", "mnp": "modalidad",
                              "customer_type": "cliente",
                              "quantity_sub": "activaciones",
                              "has_cash_in": "con_recarga",
                              "amount_add": "monto_recarga"})

tabla["tipo_linea"] = tabla["tipo_linea"].replace(
    {"Prepaid": "Prepago", "Postpaid": "Pospago"})
tabla["modalidad"] = tabla["modalidad"].replace(
    {"New line": "Linea nueva", "MNP": "Portabilidad",
     "Pre to Post by CM": "Migracion pre a post"})
tabla["cliente"] = tabla["cliente"].replace(
    {"-": "Sin dato", "Old customer": "Antiguo",
     "New customer over 3 months": "Nuevo mas de 3 meses",
     "New customer over 6 months": "Nuevo mas de 6 meses"})

resumen = tabla.groupby(
    ["fecha", "centro", "canal", "tipo_linea", "modalidad", "cliente"],
    as_index=False).agg(activaciones=("activaciones", "sum"),
                        con_recarga=("con_recarga", "sum"),
                        monto_recarga=("monto_recarga", "sum"))
resumen["monto_recarga"] = resumen["monto_recarga"].round(2)
resumen.to_csv("datos_limpios.csv", index=False)

print(resumen.shape, resumen["activaciones"].sum())

with open("datos_limpios.csv", encoding="utf-8") as archivo:
    texto = archivo.read().strip()

with open("datos.js", "w", encoding="utf-8") as archivo:
    archivo.write("const datosCSV = `" + texto + "`;\n")