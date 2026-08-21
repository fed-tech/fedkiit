"use client";

import { useState, useEffect, useContext } from "react";

import styles from "./style/Signup.module.scss";

import { useGoogleLogin } from "@react-oauth/google";
import AuthContext, { SESSION_TTL_MS } from "../../context/AuthContext";
import google from "../../assets/images/google.png";
import { MicroLoading } from "../../microInteraction";
import { api } from "../../services";
import { useRouter } from "next/navigation";
import postAuthRedirect from "../../utils/postAuthRedirect";
import { isGoogleOAuthEnabled } from "../../utils/googleOAuth";

function GoogleSignupButton({ setAlert }) {
  const [codeResponse, setCodeResponse] = useState(null);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [navigatePath, setNavigatePath] = useState("/");
  const authCtx = useContext(AuthContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const signUp = useGoogleLogin({
    onSuccess: (response) => setCodeResponse(response),
    onError: (error) => console.error("SignUp failed:", error),
  });

  useEffect(() => {
    if (codeResponse) {
      handleSignUpSuccess();
    }
  }, [codeResponse]);

  useEffect(() => {
    if (shouldNavigate) {
      router.replace(navigatePath);
      setShouldNavigate(false);
    }
  }, [shouldNavigate, navigatePath, router]);

  const handleSignUpSuccess = async () => {
    setIsLoading(true);
    try {
      try {
        const response = await api.post("/api/auth/googleAuth", {
          access_token: codeResponse.access_token,
        });

        if (response.status === 200 || response.status === 201) {
          const user = response.data.user;

          setAlert({
            type: "success",
            message:
              response.status === 200
                ? "User Already Registered! Logged In successfully"
                : "User Registered! Logged In successfully",
            position: "bottom-right",
            duration: 3000,
          });
          setNavigatePath(postAuthRedirect("/"));

          setTimeout(() => {
            localStorage.setItem("token", response.data.token);
            authCtx.login(
              user.name,
              user.email,
              user.img,
              user.rollNumber,
              user.school,
              user.college,
              user.contactNo,
              user.year,
              user.extra?.github,
              user.extra?.linkedin,
              user.extra?.designation,
              user.access,
              user.editProfileCount,
              user.regForm,
              user.blurhash,
              response.data.token,
              SESSION_TTL_MS,
            );
            setShouldNavigate(true);
          }, 800);
        } else {
          console.log("Unexpected backend response status:", response.status);
        }
      } catch (error) {
        console.error("Backend API call failed:", error);
      }
    } catch (error) {
      console.error("SignUp error:", error);
      setAlert({
        type: "error",
        message: "There was an error Signing Up. Please try again.",
        position: "bottom-right",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      style={{
        backgroundColor: "transparent",
        color: "#fff",
        height: "40px",
        marginTop: "20px",
        fontSize: ".77rem",
        cursor: "pointer",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      className={styles.google_btn}
      onClick={() => signUp()}
    >
      {isLoading ? (
        <MicroLoading />
      ) : (
        <>
          <img
            src={google.src}
            alt="google"
            style={{
              width: "18px",
              height: "18px",
              marginRight: "6px",
            }}
          />
          <span>SignUp with Google</span>
        </>
      )}
    </button>
  );
}

export default function GoogleSignup({ setAlert }) {
  if (!isGoogleOAuthEnabled()) {
    return null;
  }

  return <GoogleSignupButton setAlert={setAlert} />;
}
