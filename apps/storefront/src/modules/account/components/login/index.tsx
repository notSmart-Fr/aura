"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { login } from "@lib/data/customer"
import { sendOTP, verifyOTP } from "@lib/data/magic-link"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import Input from "@modules/common/components/input"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [step, setStep] = useState<"email" | "choices" | "otp">("email")
  const [selectedChoice, setSelectedChoice] = useState<"password" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 6-digit OTP state and refs
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""))
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Reset OTP state when entering the OTP step
  useEffect(() => {
    if (step === "otp") {
      setOtp(Array(6).fill(""))
      // Delay focus slightly to ensure DOM has rendered
      setTimeout(() => {
        inputRefs[0].current?.focus()
      }, 50)
    }
  }, [step])

  const handleEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const emailValue = formData.get("email") as string
    
    if (!emailValue || !emailValue.includes("@")) {
      setError("Please enter a valid email address.")
      return
    }

    setEmail(emailValue)
    setStep("choices")
  }

  const handleRequestOTP = async () => {
    setLoading(true)
    setError(null)
    const result = await sendOTP(email)
    setLoading(false)

    if (result.success) {
      setStep("otp")
    } else {
      setError(result.error || "Failed to send verification code.")
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const code = otp.join("")

    if (code.length !== 6) {
      setError("Please enter a valid 6-digit code.")
      setLoading(false)
      return
    }

    try {
      const result = await verifyOTP(email, code)
      if (result.success) {
        try {
          router.refresh()
        } catch (routerErr) {
          console.error("Router refresh failed:", routerErr)
        }
        setTimeout(() => {
          window.location.href = "/account"
        }, 150)
      } else {
        setError(result.error || "Verification failed.")
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
      setLoading(false)
    }
  }

  const handleOtpChange = (value: string, index: number) => {
    const digit = value.slice(-1) // Take only the last entered digit
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    // Move focus to next input if digit was entered
    if (digit && index < 5) {
      inputRefs[index + 1].current?.focus()
    }
  }

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Move focus back on Backspace if current box is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").trim().slice(0, 6)
    
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp]
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i]
      }
      setOtp(newOtp)
      
      // Focus the last input box or the next unfilled box
      const targetIndex = Math.min(pastedData.length, 5)
      inputRefs[targetIndex].current?.focus()
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set("email", email)

    const result = await login(null, formData)
    if (result) {
      setError(result)
      setLoading(false)
    } else {
      window.location.href = "/account"
    }
  }

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="login-page"
    >
      <h1 className="font-display-lg text-headline-md uppercase mb-4 text-primary">Welcome back</h1>
      
      {step === "email" && (
        <>
          <p className="text-center font-body-md text-zinc-500 mb-8">
            Sign in to access an enhanced shopping experience.
          </p>
          <form className="w-full" onSubmit={handleEmailSubmit}>
            <div className="flex flex-col w-full gap-y-2">
              <Input
                label="Email"
                name="email"
                type="email"
                title="Enter a valid email address."
                autoComplete="email"
                required
                defaultValue={email}
                data-testid="email-input"
                className="rounded-none border-zinc-200"
              />
            </div>
            {error && <ErrorMessage error={error} data-testid="login-error-message" />}
            <button
              type="submit"
              data-testid="continue-button"
              className="w-full mt-6 bg-primary text-white py-4 font-label-lg uppercase tracking-widest hover:bg-secondary transition-colors duration-300 rounded-none"
            >
              Continue
            </button>
          </form>
        </>
      )}

      {step === "choices" && (
        <div className="w-full flex flex-col items-center">
          <p className="text-center font-body-md text-[10px] uppercase tracking-widest text-zinc-400 mb-2">
            Signing in as
          </p>
          <p className="text-center font-body-lg font-bold text-zinc-900 mb-6">
            {email}
          </p>

          <div className="flex flex-col w-full gap-y-3 mb-6">
            <button
              type="button"
              onClick={handleRequestOTP}
              disabled={loading}
              className="w-full bg-zinc-900 text-white py-3 text-xs uppercase tracking-widest rounded-none hover:bg-zinc-800 transition-colors duration-300 disabled:opacity-50 font-label-md"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedChoice("password")}
              className={`w-full border border-zinc-200 text-zinc-900 bg-transparent rounded-none py-3 text-xs uppercase tracking-widest hover:bg-zinc-50 transition-colors duration-300 font-label-md ${
                selectedChoice === "password" ? "bg-zinc-50 border-zinc-900" : ""
              }`}
            >
              Enter Password
            </button>
          </div>

          {error && <ErrorMessage error={error} data-testid="login-error-message" />}

          {selectedChoice === "password" && (
            <form className="w-full" onSubmit={handlePasswordSubmit}>
              <div className="flex flex-col w-full gap-y-2">
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  data-testid="password-input"
                  className="rounded-none border-zinc-200"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                data-testid="sign-in-button"
                className="w-full mt-6 bg-primary text-white py-4 font-label-lg uppercase tracking-widest hover:bg-secondary transition-colors duration-300 rounded-none disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              setStep("email")
              setSelectedChoice(null)
              setError(null)
            }}
            className="text-center font-label-md text-zinc-500 hover:text-zinc-900 uppercase tracking-widest text-xs mt-6 transition-colors duration-300"
          >
            Back to email
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="w-full flex flex-col items-center">
          <p className="text-center font-body-md text-zinc-500 mb-1">
            Verification code sent to
          </p>
          <p className="text-center font-body-lg font-bold text-primary mb-6">
            {email}
          </p>

          <form className="w-full" onSubmit={handleVerifyOTP}>
            <div className="flex flex-col items-center w-full gap-y-2">
              <label className="text-zinc-400 font-label-md text-xs uppercase tracking-widest mb-2">
                Enter 6-Digit Code
              </label>
              
              <div className="flex gap-x-2 justify-center w-full my-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-12 text-center text-lg font-bold border border-zinc-200 focus:border-primary focus:outline-none focus:ring-0 rounded-none bg-white text-primary transition-all duration-150"
                  />
                ))}
              </div>
            </div>

            {error && <ErrorMessage error={error} data-testid="login-error-message" />}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-primary text-white py-4 font-label-lg uppercase tracking-widest hover:bg-secondary transition-colors duration-300 rounded-none disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>

          <div className="flex justify-between w-full mt-6">
            <button
              type="button"
              onClick={handleRequestOTP}
              disabled={loading}
              className="font-label-md text-zinc-500 hover:text-zinc-900 uppercase tracking-widest text-xs disabled:opacity-50"
            >
              Resend Code
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email")
                setSelectedChoice(null)
                setError(null)
              }}
              className="font-label-md text-zinc-500 hover:text-zinc-900 uppercase tracking-widest text-xs"
            >
              Change Email
            </button>
          </div>
        </div>
      )}

      <span className="text-center text-zinc-500 text-xs mt-8">
        Not a member?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="underline text-primary hover:text-zinc-600 transition-colors"
          data-testid="register-button"
        >
          Join us
        </button>
        .
      </span>
    </div>
  )
}

export default Login
