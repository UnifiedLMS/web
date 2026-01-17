using System;
using System.Collections;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

public class LogOutAnimation : MonoBehaviour
{
    [Header("Animation Settings")]
    [SerializeField] private float fadeDuration = 1f;
    [SerializeField] private float slideDistance = 50f;
    [SerializeField] private AnimationCurve fadeEaseCurve;

    [Header("Object Lists")]
    [SerializeField] private List<GameObject> objectsToEnable = new List<GameObject>();
    [SerializeField] private List<GameObject> secondaryObjectsToDisable = new List<GameObject>();

    [Header("Scene Transition")]
    [SerializeField] private string targetScene;

    [Header("UI Buttons")]
    [SerializeField] private Button enableButton;
    [SerializeField] private Button disableButton;
    [SerializeField] private Button transitionButton;

    private void Start()
    {
        foreach (var obj in objectsToEnable)
        {
            if (obj != null)
            {
                obj.SetActive(false);
            }
        }

        if (enableButton != null)
            enableButton.onClick.AddListener(() => {
        StartCoroutine(FadeInObjectsSimultaneously(objectsToEnable));
            });

        if (disableButton != null)
            disableButton.onClick.AddListener(() => {
        StartCoroutine(FadeOutObjectsSimultaneously(objectsToEnable));
            });

        if (transitionButton != null)
            transitionButton.onClick.AddListener(() => StartCoroutine(DisablePrimaryAndFadeOutSecondary()));
    }

    public void EnableObjectsWithAnimation()
    {
        StartCoroutine(FadeInObjectsSimultaneously(objectsToEnable));
    }

    public void DisableObjectsWithAnimation()
    {
        StartCoroutine(FadeOutObjectsSimultaneously(objectsToEnable));
    }

    private async Task LogoutWithTokenAsync()
    {
        string token = PlayerPrefs.GetString("token", null);
        if (string.IsNullOrEmpty(token))
        {
            return;
        }

        using HttpClient client = new HttpClient();
        client.DefaultRequestHeaders.Add("access-token", token);
        client.DefaultRequestHeaders.Add("token-type", "bearer");

        try
        {
            HttpResponseMessage response = await client.PostAsync("https://unifyapi.onrender.com/api/v1/auth/logout", null);

            if (!response.IsSuccessStatusCode &&
                response.StatusCode != System.Net.HttpStatusCode.Unauthorized &&
                response.StatusCode != System.Net.HttpStatusCode.Forbidden)
            {
                Debug.LogError($"[LogOut] Logout failed. Status Code: {response.StatusCode}");
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"[LogOut] Logout request exception: {e.Message}");
        }
    }

    private IEnumerator FadeInObjectsSimultaneously(List<GameObject> objects)
    {
        yield return UnifiedAnimation.FadeAndSlide(objects, true, fadeDuration, slideDistance, fadeEaseCurve);
    }

    private IEnumerator FadeOutObjectsSimultaneously(List<GameObject> objects)
    {
        yield return UnifiedAnimation.FadeAndSlide(objects, false, fadeDuration, slideDistance, fadeEaseCurve);
    }

    private IEnumerator DisablePrimaryAndFadeOutSecondary()
    {
        yield return StartCoroutine(FadeOutObjectsSimultaneously(objectsToEnable));
        yield return StartCoroutine(FadeOutObjectsSimultaneously(secondaryObjectsToDisable));

        var logoutTask = LogoutWithTokenAsync();
        while (!logoutTask.IsCompleted) yield return null;
        PlayerPrefs.DeleteKey("token");
        FetchNameAndDisplay.ClearCache();
        SceneManager.LoadScene(targetScene);
    }
}
