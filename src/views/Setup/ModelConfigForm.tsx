import React, { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { FieldDefinition, InterfaceProvider, PROVIDER_LABELS, PROVIDERS } from "../../atoms/interfaceState"
import { InterfaceModelConfig, ModelConfig, saveFirstConfigAtom, writeEmptyConfigAtom } from "../../atoms/configState"
import { ignoreFieldsForModel } from "../../constants"
import { useSetAtom } from "jotai"
import { loadConfigAtom } from "../../atoms/configState"
import useDebounce from "../../hooks/useDebounce"
import { showToastAtom } from "../../atoms/toastState"
import Input from "../../components/WrappedInput"
import { transformModelProvider } from "../../helper/config"

interface ModelConfigFormProps {
  provider: InterfaceProvider
  fields: Record<string, FieldDefinition>
  onProviderChange?: (provider: InterfaceProvider) => void
  onSubmit: (data: any) => void
  submitLabel?: string
}

const ModelConfigForm: React.FC<ModelConfigFormProps> = ({
  provider,
  fields,
  onProviderChange,
  onSubmit,
  submitLabel = "setup.submit",
}) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<InterfaceModelConfig>({} as InterfaceModelConfig)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerifyingNoTool, setIsVerifyingNoTool] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [listOptions, setListOptions] = useState<Record<string, string[]>>({} as Record<string, string[]>)
  const initProvider = useRef(provider)
  const loadConfig = useSetAtom(loadConfigAtom)
  const saveConfig = useSetAtom(saveFirstConfigAtom)
  const writeEmptyConfig = useSetAtom(writeEmptyConfigAtom)
  const showToast = useSetAtom(showToastAtom)

  const [fetchListOptions, cancelFetch] = useDebounce(async (key: string, field: FieldDefinition, deps: Record<string, string>) => {
    try {
      const options = await field.listCallback!(deps)
      setListOptions(prev => ({
        ...prev,
        [key]: options
      }))

      if (options.length > 0 && !options.includes(formData[key as keyof ModelConfig] as string)) {
        handleChange(key, options[0])
      }
    } catch (error) {
      showToast({
        message: t("setup.verifyError"),
        type: "error"
      })
    }
  }, 100)

  useEffect(() => {
    if (initProvider.current !== provider) {
      setListOptions({})
      setFormData(getFieldDefaultValue())
    }
  }, [provider])

  useEffect(() => {
    Object.entries(fields).forEach(([key, field]) => {
      if (field.type === "list" && field.listCallback && field.listDependencies) {
        const deps = field.listDependencies.reduce((acc, dep) => ({
          ...acc,
          [dep]: formData[dep as keyof InterfaceModelConfig] || ""
        }), {})

        const allDepsHaveValue = field.listDependencies.every(dep => !!formData[dep as keyof ModelConfig])

        if (allDepsHaveValue) {
          fetchListOptions(key, field, deps)
        }
      }
    })

    return () => {
      cancelFetch()
    }
  }, [fields, formData])

  const getFieldDefaultValue = () => {
    return Object.keys(fields).reduce((acc, key) => {
      return {
        ...acc,
        [key]: fields[key].default
      }
    }, {} as InterfaceModelConfig)
  }

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as InterfaceProvider
    onProviderChange?.(newProvider)
    setIsVerified(false)
  }

  const prepareModelConfig = useCallback((config: InterfaceModelConfig, provider: InterfaceProvider) => {
    const _config = {...config}
    if (_config.topP === 0) {
      delete (_config as any).topP
    }

    if (_config.temperature === 0) {
      delete (_config as any).temperature
    }

    return Object.keys(_config).reduce((acc, key) => {
      if (ignoreFieldsForModel.some(item => (item.model === _config.model || _config.model?.startsWith(item.prefix)) && item.fields.includes(key))) {
        return acc
      }

      return {
        ...acc,
        [key]: _config[key as keyof ModelConfig]
      }
    }, {} as InterfaceModelConfig)
  }, [])

  const verifyModel = async () => {
    try {
      setIsVerifying(true)
      const modelProvider = transformModelProvider(provider)
      const configuration = {...formData} as Partial<Pick<ModelConfig, "configuration">> & Omit<ModelConfig, "configuration">
      delete configuration.configuration

      const _formData = prepareModelConfig(formData, provider)

      if (modelProvider === "bedrock") {
        _formData.apiKey = (_formData as any).accessKeyId || (_formData as any).credentials.accessKeyId
        if (!((_formData as any).credentials)) {
          ;(_formData as any).credentials = {
            accessKeyId: (_formData as any).accessKeyId,
            secretAccessKey: (_formData as any).secretAccessKey,
            sessionToken: (_formData as any).sessionToken,
          }
        }
      }

      const response = await fetch("/api/modelVerify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          modelSettings: {
            ..._formData,
            modelProvider,
            configuration,
          },
        }),
      })

      const data = await response.json()
      if (data.success) {
        setIsVerified(true)
        if(data.connectingSuccess && data.supportTools) {
          setIsVerifyingNoTool(false)
          showToast({
            message: t("setup.verifySuccess"),
            type: "success",
            duration: 5000
          })
        }else if(data.connectingSuccess || data.supportTools){
          setIsVerifyingNoTool(true)
          showToast({
            message: t("setup.verifySuccessNoTool"),
            type: "success",
            duration: 5000
          })
        }
      } else {
        setIsVerified(false)
        showToast({
          message: t("setup.verifyFailed"),
          type: "error",
          duration: 5000
        })
      }
    } catch (error) {
      console.error("Failed to verify model:", error)
      setIsVerified(false)
      showToast({
        message: t("setup.verifyError"),
        type: "error"
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm())
      return

    const _formData = prepareModelConfig(formData, provider)

    try {
      setIsSubmitting(true)
      const data = await saveConfig({ data: _formData, provider })
      await onSubmit(data)
      loadConfig()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
    setErrors(prev => ({
      ...prev,
      [key]: ""
    }))
    if(fields[key]?.required) {
      setIsVerified(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    Object.entries(fields).forEach(([key, field]) => {
      if (field.required && !formData[key as keyof ModelConfig]) {
        newErrors[key] = t("setup.required")
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }
    return true
  }

  const handleSkip = () => {
    writeEmptyConfig()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>{t("setup.provider")}</label>
        <select
          value={provider}
          onChange={handleProviderChange}
          className="provider-select"
        >
          {PROVIDERS.map(p => (
            <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {Object.entries(fields).map(([key, field]) => (
        <div key={key} className="form-group">
          <label>
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>
          <div className="field-description">{t(field.description)}</div>
          {field.type === "list" ? (
            <select
              value={formData[key as keyof ModelConfig] as string || ""}
              onChange={e => handleChange(key, e.target.value)}
              className={errors[key] ? "error" : ""}
            >
              <option value="">{field.placeholder}</option>
              {listOptions[key]?.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={"text"}
              value={formData[key as keyof ModelConfig] as string || ""}
              onChange={e => handleChange(key, e.target.value)}
              placeholder={field.placeholder?.toString()}
              className={errors[key] ? "error" : ""}
            />
          )}
          {key==="model" && isVerifyingNoTool && (
              <div className="field-model-description">
                {t("setup.verifySuccessNoTool")}
              </div>
          )}
          {errors[key] && <div className="error-message">{errors[key]}</div>}
        </div>
      ))}

      <div className="form-actions">
        <button
          type="button"
          className="verify-btn"
          onClick={verifyModel}
          disabled={isVerifying || isSubmitting}
        >
          {isVerifying ? (
            <div className="loading-spinner"></div>
          ) : t("setup.verify")}
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={isVerifying || isSubmitting || !isVerified}
        >
          {isSubmitting ? (
            <div className="loading-spinner"></div>
          ) : t(submitLabel)}
        </button>
      </div>

      <div className="form-actions">
        <div className="skip-btn" onClick={handleSkip}>Skip</div>
      </div>

    </form>
  )
}

export default React.memo(ModelConfigForm)