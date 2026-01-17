using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.Networking;
using Newtonsoft.Json;
using System.Collections;
using UnityEngine.SceneManagement;
using System;

public class LogInScript : MonoBehaviour
{
    [Header("UI References")]
    [SerializeField] private TMP_InputField codeInputField;
    [SerializeField] private TMP_InputField passwordInputField;
    [SerializeField] private Button checkButton;
    [SerializeField] private TMP_Text errorMessage;

    [Header("Animations")]
    [SerializeField] private LogInSlideDown logInSlideDown;
    [SerializeField] private LogInSlideIn logInSlideIn;

    [Header("Scenes")]
    [SerializeField] private string sceneToLoadStudents;
    [SerializeField] private string sceneToLoadTeachers;

    private string token;
    private const string TOKEN_PREF_KEY = "token";
    private const string LOGIN_URL = "https://unifyapi.onrender.com/api/v1/auth/login";
    private const string TOKEN_URL = "https://unifyapi.onrender.com/api/v1/auth/token";

    private void Start()
    {
        Application.targetFrameRate = 60;
        QualitySettings.vSyncCount = 0;

        checkButton.onClick.AddListener(OnCheckButtonPressed);

        StartCoroutine(TryAuthOnStart());
    }

    private void OnCheckButtonPressed()
    {
        StartCoroutine(CheckCredentials());
    }

    private IEnumerator TryAuthOnStart()
    {
        string existingToken = PlayerPrefs.GetString(TOKEN_PREF_KEY);

        if (!string.IsNullOrEmpty(existingToken))
        {
            yield return TryAuthWithToken(existingToken);
        }
        else
        {
            logInSlideIn?.NotifyObjectLoaded();
        }
    }

    private IEnumerator CheckCredentials()
    {
        string enteredCode = codeInputField.text.Trim();
        string enteredPassword = passwordInputField.text.Trim();

        if (enteredCode.Length < 8)
        {
            DisplayErrorMessage("Код ЄДЕБО містить що найменше 8 символів!");
            yield break;
        }

        yield return VerifyCredentials(enteredCode, enteredPassword);
    }

    private IEnumerator TryAuthWithToken(string existingToken)
    {
        checkButton.interactable = false;

        WWWForm emptyForm = new WWWForm(); // empty POST body
        using UnityWebRequest request = UnityWebRequest.Post(TOKEN_URL, emptyForm);
        request.SetRequestHeader("access-token", existingToken);
        request.SetRequestHeader("token-type", "bearer");

        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError($"[Auth] Token auth failed: {request.error}");
            checkButton.interactable = true;
            logInSlideIn?.NotifyObjectLoaded();
            yield break;
        }

        AuthResponse result = JsonConvert.DeserializeObject<AuthResponse>(request.downloadHandler.text);

        if (!string.IsNullOrEmpty(result.access_token))
        {
            SaveToken(result.access_token);
            LoadSceneByRole(result.role);
        }
        else
        {
            PlayerPrefs.DeleteKey(TOKEN_PREF_KEY);
            logInSlideIn?.NotifyObjectLoaded();
        }

        checkButton.interactable = true;
    }

    private IEnumerator VerifyCredentials(string username, string password)
    {
        checkButton.interactable = false;

        WWWForm form = new WWWForm();
        form.AddField("grant_type", "password");
        form.AddField("username", username);
        form.AddField("password", password);
        form.AddField("scope", "");
        form.AddField("client_id", "");
        form.AddField("client_secret", "");

        using UnityWebRequest request = UnityWebRequest.Post(LOGIN_URL, form);
        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError($"[Auth] Login failed: {request.error}");
            DisplayErrorMessage("Неправильні введені дані");
        }
        else
        {
            AuthResponse result = JsonConvert.DeserializeObject<AuthResponse>(request.downloadHandler.text);
            SaveToken(result.access_token);

            if (logInSlideDown != null)
            {
                LoadSceneAnimated(result.role);
            }
            else
            {
                LoadSceneByRole(result.role);
            }
        }

        checkButton.interactable = true;
    }

    private void SaveToken(string newToken)
    {
        token = newToken;
        PlayerPrefs.SetString(TOKEN_PREF_KEY, token);
        PlayerPrefs.Save();
    }

    private void LoadSceneByRole(string role)
    {
        if (role == "students")
        {
            SceneManager.LoadScene(sceneToLoadStudents);
        }
        else if (role == "teachers")
        {
            SceneManager.LoadScene(sceneToLoadTeachers);
        }
        else
        {
            logInSlideIn?.NotifyObjectLoaded();
        }
    }

    private void LoadSceneAnimated(string role)
    {
        if (role == "students")
        {
            logInSlideDown.StartMoveAndFade(sceneToLoadStudents);
        }
        else if (role == "teachers")
        {
            logInSlideDown.StartMoveAndFade(sceneToLoadTeachers);
        }
        else
        {
            logInSlideIn?.NotifyObjectLoaded();
        }
    }

    private void DisplayErrorMessage(string message)
    {
        if (errorMessage != null)
        {
            codeInputField.text = "";
            passwordInputField.text = "";
            errorMessage.text = message;

            Color color = errorMessage.color;
            color.a = 1f;
            errorMessage.color = color;
        }
    }

    [Serializable]
    public class AuthResponse
    {
        public string access_token;
        public string role;
    }
}
