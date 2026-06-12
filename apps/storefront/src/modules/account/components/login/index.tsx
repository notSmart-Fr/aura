"use client"

import { useState } from "react"
import { login } from "@lib/data/customer"
import { sendMagicLink } from "@lib/data/magic-link"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import Input from "@modules/common/components/input"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [email, setEmail] = useState("")
  const [step, setStep] = useState<"email" | "choices" | "sent">("email")
  const [selectedChoice, setSelectedChoice] = useState<"password" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  const handleSendMagicLink = async () => {
    setLoading(true)
    setError(null)
    const result = await sendMagicLink(email)
    setLoading(false)

    if (result.success) {
      setStep("sent")
    } else {
      setError(result.error || "Failed to send magic link.")
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
      <h1 className="font-display-lg text-headline-md uppercase mb-4">Welcome back</h1>
      
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
          <p className="text-center font-body-md text-zinc-500 mb-2">
            Signing in as
          </p>
          <p className="text-center font-body-lg font-bold text-primary mb-6">
            {email}
          </p>

          <div className="flex w-full justify-between items-center border-t border-b border-zinc-100 py-4 mb-6">
            <button
              type="button"
              onClick={() => setSelectedChoice("password")}
              className={`font-label-md text-xs uppercase tracking-widest transition-colors duration-300 ${
                selectedChoice === "password"
                  ? "text-primary font-bold border-b border-primary pb-0.5"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Enter Password
            </button>
            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={loading}
              className="font-label-md text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors duration-300 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Magic Link Instead"}
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
            className="text-center font-label-md text-zinc-400 hover:text-zinc-600 uppercase tracking-widest text-xs mt-6"
          >
            Back to email
          </button>
        </div>
      )}

      {step === "sent" && (
        <div className="w-full flex flex-col items-center text-center">
          <p className="font-body-lg text-primary mb-4 font-medium">
            Check your inbox
          </p>
          <p className="font-body-md text-zinc-500 mb-8">
            A secure magic sign-in link has been sent to <span className="font-bold text-primary">{email}</span>. Please click the link to verify your identity and log in.
          </p>
          <button
            type="button"
            onClick={() => {
              setStep("email")
              setSelectedChoice(null)
              setError(null)
            }}
            className="w-full bg-primary text-white py-4 font-label-lg uppercase tracking-widest hover:bg-secondary transition-colors duration-300 rounded-none"
          >
            Return to Sign In
          </button>
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
